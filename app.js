const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (like your index.html) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file when accessing the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Scrape tables function
async function scrapeTables(url, initBtnSelector, nextBtnSelector) {
  try {
    // Launch Puppeteer in non-headless mode for debugging
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const tables = [];

    // If an init button selector is provided, click it first
    if (initBtnSelector) {
      await page.waitForSelector(initBtnSelector);
      await page.click(initBtnSelector);
      await page.waitForSelector('table', { timeout: 5000 }); // Wait for tables to appear after click
    }

    // Wait for tables to load (ensure tables are rendered)
    await page.waitForSelector('table', { timeout: 5000 });

    let hasNextPage = true;

    while (hasNextPage) {
      // Scrape the tables on the current page
      const pageTables = await page.evaluate(() => {
        const tablesArray = [];
        const tableElements = document.querySelectorAll('table');
        
        tableElements.forEach((tableElement) => {
          const rows = [];
          const rowsElements = tableElement.querySelectorAll('tr');
          rowsElements.forEach((row) => {
            const cells = [];
            const cellElements = row.querySelectorAll('td, th');
            cellElements.forEach((cell) => {
              cells.push(cell.innerText.trim());
            });
            rows.push(cells);
          });
          tablesArray.push(rows);
        });
        return tablesArray;
      });

      if (pageTables.length > 0) {
        tables.push(...pageTables);
      }

      // Check if "Next" button exists for pagination
      hasNextPage = nextBtnSelector ? await page.$(nextBtnSelector) !== null : false;

      if (hasNextPage) {
        await page.click(nextBtnSelector);
        await page.waitForSelector('table', { timeout: 5000 }); // Ensure tables are loaded before continuing
      }
    }

    await browser.close();
    return tables;
  } catch (error) {
    console.error('Error scraping tables across multiple pages:', error);
    throw new Error('Failed to scrape tables');
  }
}

// Convert the scraped tables to Excel using ExcelJS and save it
async function saveTablesToExcel(tables, filePath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scraped Tables');
  let rowIndex = 1;  // Track row index

  tables.forEach((tableData) => {
    if (tableData.length === 0) return;
    tableData.forEach((rowData) => {
      worksheet.addRow(rowData);
      rowIndex++;
    });
    rowIndex++; // Add gap between tables
  });

  await workbook.xlsx.writeFile(filePath);
  console.log('Excel file saved successfully:', filePath);
}

// POST endpoint to handle scraping
app.post('/scrape', async (req, res) => {
  const { url, initBtn, nextBtn } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Scrape tables
    const tables = await scrapeTables(url, initBtn, nextBtn);

    if (tables.length === 0) {
      return res.status(404).json({ error: 'No tables found on the page' });
    }

    const filePath = path.join(__dirname, 'scraped_tables.xlsx');
    await saveTablesToExcel(tables, filePath);
    
    // Send the file to the client
    res.download(filePath, 'scraped_tables.xlsx', (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }

      // Optionally delete the file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting the file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('Error scraping the URL:', error);
    res.status(500).json({ error: 'Failed to scrape tables' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
