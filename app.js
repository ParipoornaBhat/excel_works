const express = require('express');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
require('dotenv').config(); // Load environment variables from .env file
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors()); // Enable CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to scrape tables using Puppeteer
async function scrapeTables(url, btn, nbtn) {
  try {
    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium', // Use .env variable or fallback
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    
    // Navigate to the page
    await page.goto(url);
    await page.setViewport({ width: 1280, height: 800 });
    
    // Click on the button to show results as a table
    await page.waitForSelector(btn);
    await page.click(btn);
    
    let tablesData = [];
    let hasNextPage = true;

    // Paginate and scrape tables until the "Next" button is not found
    while (hasNextPage) {
      // Scrape the tables from the current page
      const pageTables = await page.$$eval('table', tables => {
        return tables.map(table => {
          const rows = Array.from(table.querySelectorAll('tr'));
          return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            return cells.map(cell => cell.textContent.trim());
          });
        });
      });

      tablesData = tablesData.concat(pageTables);
      
      // Check if there's a "Next" button and click it
      try {
        const nextButton = await page.$(nbtn);
        if (nextButton) {
          await nextButton.click();
          console.log('Next button clicked');
          await page.waitForTimeout(2000); // Wait for the next page to load
        } else {
          console.log('No more pages');
          hasNextPage = false;
        }
      } catch (error) {
        console.log('Error clicking "Next" button:', error);
        hasNextPage = false;
      }
    }

    // Close the browser
    await browser.close();

    return tablesData;
  } catch (error) {
    console.error('Error scraping tables:', error);
    throw new Error('Failed to scrape tables');
  }
}

// Route to scrape tables and generate an Excel file
app.post('/scrape', async (req, res) => {
  const { url, btn, nbtn } = req.body;

  if (!url || !btn || !nbtn) {
    return res.status(400).send('URL, button selector, and next button selector are required');
  }

  try {
    console.log('Starting scraping process...');
    
    // Scrape tables from the provided URL
    const tablesData = await scrapeTables(url, btn, nbtn);

    // Create a new Excel workbook and add data to it
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scraped Tables');

    tablesData.forEach(tableData => {
      tableData.forEach(rowData => {
        worksheet.addRow(rowData);
      });
      worksheet.addRow([]); // Add an empty row between tables
    });

    // Generate a unique filename based on timestamp
    const timestamp = Date.now();
    const filename = `scraped_tables_${timestamp}.xlsx`;
    const filePath = path.join(__dirname, filename);

    // Write the Excel file
    await workbook.xlsx.writeFile(filePath);

    // Send the Excel file to the client
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Failed to download the file');
      } else {
        // Clean up: delete the file after sending
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
    });
  } catch (error) {
    console.error('Error scraping the URL:', error);
    res.status(500).send('Failed to scrape tables from the URL');
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
