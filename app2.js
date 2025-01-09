const express = require('express');
const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// Serve the front-end form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Scrape the page and generate a new Excel file for each post
app.post('/scrape', async (req, res) => {
  const { url, initialiseBtnSelector, nextBtnSelector } = req.body;
  let browser, page;
  console.log(initialiseBtnSelector)

  try {
    // Launch the browser and create a page
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Start the process of scraping and creating Excel files for each page
    let pageNumber = 1;
    let filePath = path.join(__dirname, `scraped-post-${pageNumber}.xlsx`); // File path for the first page

    // Create a new Excel workbook for the first page
    const workbook = new ExcelJS.Workbook();
    let sheet = workbook.addWorksheet(`Page ${pageNumber}`);

    // If an initialise button selector is provided, attempt to click it
    if (initialiseBtnSelector) {
      console.log('Looking for initialise button...');
      const initialiseBtn = await page.$(initialiseBtnSelector);
      if (initialiseBtn) {
        await initialiseBtn.click();
        await page.waitForSelector(nextBtnSelector || 'body'); // Wait for next page or fallback to body
      } else {
        console.log('Initialise button not found.');
        // Optionally take a screenshot and log it
        await page.screenshot({ path: 'initialise-error.png' });
      }
    } else {
      console.log('Initialise button selector not provided, skipping.');
    }

    // Scrape data from the current page (assuming a table structure)
    const data = await page.evaluate(() => {
      const rows = [];
      document.querySelectorAll('table tr').forEach(row => {
        const cols = row.querySelectorAll('td');
        const rowData = Array.from(cols).map(col => col.innerText.trim());
        rows.push(rowData);
      });
      return rows;
    });

    // Add the scraped data to the Excel sheet
    data.forEach(row => {
      sheet.addRow(row);
    });

    // Save the Excel file for the current page
    await workbook.xlsx.writeFile(filePath);
    console.log(`File for page ${pageNumber} saved at ${filePath}`);

    // Loop through next pages and scrape, creating a new Excel file for each post
    let nextPageExists = true;
    while (nextPageExists && nextBtnSelector) {
      const nextBtn = await page.$(nextBtnSelector);
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(2000); // Wait for the page to load
        pageNumber++;

        // Create a new workbook and worksheet for the next page
        const newWorkbook = new ExcelJS.Workbook();
        const newSheet = newWorkbook.addWorksheet(`Page ${pageNumber}`);

        // Scrape new page data
        const nextPageData = await page.evaluate(() => {
          const rows = [];
          document.querySelectorAll('table tr').forEach(row => {
            const cols = row.querySelectorAll('td');
            const rowData = Array.from(cols).map(col => col.innerText.trim());
            rows.push(rowData);
          });
          return rows;
        });

        // Add the scraped data to the new worksheet
        nextPageData.forEach(row => {
          newSheet.addRow(row);
        });

        // Save the new Excel file for the current page
        filePath = path.join(__dirname, `scraped-post-${pageNumber}.xlsx`);
        await newWorkbook.xlsx.writeFile(filePath);
        console.log(`File for page ${pageNumber} saved at ${filePath}`);

      } else {
        nextPageExists = false;
        console.log('Next button not found.');
        await page.screenshot({ path: 'next-button-not-found.png' });
      }
    }

    // After scraping all pages, close the browser
    await page.close();
    await browser.close();

    // Send the last created Excel file as the download (for the last scraped page)
    if (fs.existsSync(filePath)) {
      res.download(filePath, `scraped-post-${pageNumber}.xlsx`, (err) => {
        if (err) {
          console.log('Error downloading the file:', err);
        }
        // Clean up after sending the file
        fs.unlinkSync(filePath); // Delete the file after sending it to the user
      });
    } else {
      res.status(500).send('The generated Excel file could not be found.');
    }

  } catch (error) {
    console.error('Error during scraping:', error);
    // Ensure `page` is available for screenshots in case of an error
    if (page) {
      await page.screenshot({ path: 'scraping-error.png' });
    }
    res.status(500).send('An error occurred while scraping the page. Screenshot saved.');
  } finally {
    if (browser) {
      await browser.close(); // Ensure browser is closed in the finally block
    }
  }
});

app.listen(3002, () => {
    console.log(`Server running at http://localhost:3002`);
  });