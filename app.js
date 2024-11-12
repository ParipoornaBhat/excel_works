const express = require('express');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const app = express();


const puppeteer = require('puppeteer');
const chromium = require('chrome-aws-lambda');  // Ensure that this import is correct

const cors = require('cors');
app.use(cors()); // This will allow all origins
require("dotenv").config();
const chromiumPath = process.env.CHROME_BIN2 || '/usr/bin/google-chrome'; 
// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory (like index.html)
app.use(express.static(path.join(__dirname)));

// Function to scrape tables from the URL
async function scrapeTables(url) {
  try {
    const { data } = await axios.get(url); // Fetch the webpage

    const dom = new JSDOM(data); // Create a virtual DOM
    const tables = dom.window.document.querySelectorAll('table'); // Get all tables

    let tablesData = [];

    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      const tableRows = [];

      rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        cells.forEach(cell => rowData.push(cell.textContent.trim()));
        if (rowData.length > 0) tableRows.push(rowData);
      });

      if (tableRows.length > 0) {
        tablesData.push(tableRows);
      }
    });

    return tablesData;
  } catch (error) {
    console.error('Error scraping the URL:', error);
    throw new Error('Failed to scrape URL');
  }
}

// Route to generate the Excel file from the scraped data
app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    const tablesData = await scrapeTables(url);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scraped Tables');

    let rowIndex = 1;

    // Add tables to the Excel sheet
    tablesData.forEach(tableData => {
      tableData.forEach(rowData => {
        worksheet.addRow(rowData);
      });
      rowIndex += tableData.length + 1;
      worksheet.addRow([]); // Add an empty row between tables
    });






    // Generate a unique filename based on the current timestamp
    const timestamp = Date.now();
    const filename = `tables_${timestamp}.xlsx`;

    const filePath = path.join(__dirname, './', filename);
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Failed to download the file');
      } else {
        // Cleanup: Delete the file after sending
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


  
  
  async function scrapeTables2(page) {
    try {
      // Wait for the table(s) to appear on the page
      await page.waitForSelector('table');  // Ensure tables are loaded on the page
      let tablesData = [];
      // Use page.$$eval() to get all the tables on the page
      const tableData = await page.$$eval('table', tables => {
        // For each table, extract rows and cells
        return tables.map(table => {
          const rows = Array.from(table.querySelectorAll('tr'));  // Get all rows in the table
          return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));  // Get all cells in the row (th or td)
            return cells.map(cell => cell.textContent.trim());  // Get the text content of each cell
          });
        });
      });
  
      // Return the structured table data
      return tableData;
  
    } catch (error) {
      console.error('Error scraping tables:', error);
      throw new Error('Failed to scrape tables');
    }
  }
  
  app.post('/scrapes', async (req, res) => {
    const { url, btn, nbtn } = req.body;
  
    if (!url) {
      return res.status(400).send('URL is required');
    }
  
    try {
      console.log('Start scraping');
  
      // Launch Puppeteer browser
      const browser = await puppeteer.launch({
        // headless: false, slowMo: 100, // Uncomment to visualize test
      });
      const page = await browser.newPage();
    
      await page.goto(url);
    
      // Resize window to 1280 x 585
      await page.setViewport({ width: 5120, height: 2341 });
    
      // Click on <button> "View results as a table"
      await page.waitForSelector(btn);
      await page.click(btn);
      let tablesData = [];
      
      let hasNextPage = true;
      // Scrape and paginate (click "Next" until no more pages)
      while (hasNextPage) {
        // Scrape the tables on the current page
        tablesData = tablesData.concat(await scrapeTables2(page));
  
        // Check if the "Next" button exists and click it
        try {
          const nextButton = await page.$(nbtn);
          
          if (nextButton) {
            await nextButton.click();
            console.log('Next button clicked');
  
            // Wait for the page to load again  // Wait for the page to update (you can adjust the timeout)
          } else {
            console.log('No more pages or "Next" button not found');
            hasNextPage = false;  // If "Next" button isn't found, exit the loop
          }
        } catch (error) {
          console.log('Error clicking "Next" button:', error);
          hasNextPage = false;
        }
      }
  
      // Process the tablesData and save to Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scraped Tables');
      let rowIndex = 1;
  
      tablesData.forEach(tableData => {
        tableData.forEach(rowData => {
          worksheet.addRow(rowData);
        });
        rowIndex += tableData.length + 1;
        worksheet.addRow([]); // Add empty row between tables
      });
  
      const timestamp = Date.now();
      const filename = `tables_${timestamp}.xlsx`;
      const filePath = path.join(__dirname, './', filename);
      await workbook.xlsx.writeFile(filePath);
  
      // Send the file to the client
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).send('Failed to download the file');
        } else {
          // Cleanup: Delete the file after sending
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      });
  
      // Close the browser session
      await browser.close();
    } catch (error) {
      console.error('Error scraping the URL:', error);
      res.status(500).send('Failed to scrape tables from the URL');
    }
  });

  app.post('/scrapess', async (req, res) => {
    const { url, nbtn } = req.body;
  
    if (!url) {
      return res.status(400).send('URL is required');
    }
  
    try {
      console.log('Start scraping');
      // Launch Puppeteer browser
      const browser = await puppeteer.launch({
        // headless: false, slowMo: 100, // Uncomment to visualize test
      });
      const page = await browser.newPage();
      await page.goto(url);
      // Resize window to 1280 x 585
      await page.setViewport({ width: 5120, height: 2341 });
      // Click on <button> "View results as a table"
      let tablesData = [];
      let hasNextPage = true;
      // Scrape and paginate (click "Next" until no more pages)
      while (hasNextPage) {
        // Scrape the tables on the current page
        tablesData = tablesData.concat(await scrapeTables2(page));
  
        // Check if the "Next" button exists and click it
        try {
          const nextButton = await page.$(nbtn);
          
          if (nextButton) {
            await nextButton.click();
            console.log('Next button clicked');
  
            // Wait for the page to load again  // Wait for the page to update (you can adjust the timeout)
          } else {
            console.log('No more pages or "Next" button not found');
            hasNextPage = false;  // If "Next" button isn't found, exit the loop
          }
        } catch (error) {
          console.log('Error clicking "Next" button:', error);
          hasNextPage = false;
        }
      }
  
      // Process the tablesData and save to Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scraped Tables');
      let rowIndex = 1;
  
      tablesData.forEach(tableData => {
        tableData.forEach(rowData => {
          worksheet.addRow(rowData);
        });
        rowIndex += tableData.length + 1;
        worksheet.addRow([]); // Add empty row between tables
      });
  
      const timestamp = Date.now();
      const filename = `tables_${timestamp}.xlsx`;
      const filePath = path.join(__dirname, './', filename);
      await workbook.xlsx.writeFile(filePath);
  
      // Send the file to the client
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).send('Failed to download the file');
        } else {
          // Cleanup: Delete the file after sending
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      });
      // Close the browser session
      await browser.close();
    } catch (error) {
      console.error('Error scraping the URL:', error);
      res.status(500).send('Failed to scrape tables from the URL');
    }
  });

  app.get('/scrapesss', async (req, res) => {
    const url="https://salfordcitycouncil.my.site.com/pr/s/register-view?c__q=eyJyZWdpc3RlciI6IkFyY3VzX0JFX1B1YmxpY19SZWdpc3RlciIsInJlcXVlc3RzIjpbeyJyZWdpc3Rlck5hbWUiOiJBcmN1c19CRV9QdWJsaWNfUmVnaXN0ZXIiLCJzZWFyY2hUeXBlIjoiYWR2YW5jZWQiLCJzZWFyY2hOYW1lIjoiUGxhbm5pbmdfQXBwbGljYXRpb25zIiwiYWR2YW5jZWRTZWFyY2hOYW1lIjoiUEFfQURWX0FsbCIsInNlYXJjaEZpbHRlcnMiOlt7ImZpZWxkTmFtZSI6ImFyY3VzYnVpbHRlbnZfX1NpdGVfQWRkcmVzc19fYyIsImZpZWxkVmFsdWUiOiIiLCJmaWVsZERldmVsb3Blck5hbWUiOiJQQV9BRFZfU2l0ZUFkZHJlc3MifSx7ImZpZWxkTmFtZSI6ImFyY3VzYnVpbHRlbnZfX1Byb3Bvc2FsX19jIiwiZmllbGRWYWx1ZSI6IiIsImZpZWxkRGV2ZWxvcGVyTmFtZSI6IlBBX0FEVl9Qcm9wb3NhbCJ9LHsiZmllbGROYW1lIjoiYXJjdXNidWlsdGVudl9fU3RhdHVzX19jIiwiZmllbGRWYWx1ZSI6IiIsImZpZWxkRGV2ZWxvcGVyTmFtZSI6IlBBX0FEVl9BcHBsaWNhdGlvblN0YXR1cyJ9LHsiZmllbGROYW1lIjoiYXJjdXNidWlsdGVudl9fV2FyZHNfX2MiLCJmaWVsZFZhbHVlIjoiIiwiZmllbGREZXZlbG9wZXJOYW1lIjoiUEFfQURWX1dhcmQifSx7ImZpZWxkTmFtZSI6ImFyY3VzYnVpbHRlbnZfX1BTX1NjYWxlX19jIiwiZmllbGRWYWx1ZSI6IiIsImZpZWxkRGV2ZWxvcGVyTmFtZSI6IlBBX0FEVl9BcHBsaWNhdGlvbl9Hcm91cCJ9LHsiZmllbGROYW1lIjoiYXJjdXNidWlsdGVudl9fVHlwZV9fYyIsImZpZWxkVmFsdWUiOiIiLCJmaWVsZERldmVsb3Blck5hbWUiOiJQQV9BRFZfQXBwbGljYXRpb25UeXBlIn0seyJmaWVsZE5hbWUiOiJhcmN1c2J1aWx0ZW52X19WYWxpZF9EYXRlX19jIiwiZmllbGRWYWx1ZSI6IiIsImZpZWxkRGV2ZWxvcGVyTmFtZSI6IlBBX0FEVl9EYXRlVmFsaWRGcm9tIn0seyJmaWVsZE5hbWUiOiJhcmN1c2J1aWx0ZW52X19WYWxpZF9EYXRlX19jIiwiZmllbGRWYWx1ZSI6IiIsImZpZWxkRGV2ZWxvcGVyTmFtZSI6IlBBX0FEVl9EYXRlVmFsaWRUbyJ9LHsiZmllbGROYW1lIjoiYXJjdXNidWlsdGVudl9fRGVjaXNpb25fTm90aWNlX1NlbnRfRGF0ZV9NYW51YWxfX2MiLCJmaWVsZFZhbHVlIjoiMjAyNC0wOS0wOSIsImZpZWxkRGV2ZWxvcGVyTmFtZSI6IlBBX0FEVl9EZWNpc2lvbk5vdGljZVNlbnREYXRlRnJvbSJ9LHsiZmllbGROYW1lIjoiYXJjdXNidWlsdGVudl9fRGVjaXNpb25fTm90aWNlX1NlbnRfRGF0ZV9NYW51YWxfX2MiLCJmaWVsZFZhbHVlIjoiMjAyNC0xMS0xMSIsImZpZWxkRGV2ZWxvcGVyTmFtZSI6IlBBX0FEVl9EZWNpc2lvbk5vdGljZVNlbnREYXRlVG8ifV19XX0%3D&c__r=Arcus_BE_Public_Register";
    const btn="div:nth-child(2) > .slds-button";
    const nbtn=".pr-pagination__item__next > .pr-pagination__link";

  
    if (!url) {
      return res.status(400).send('URL is required');
    }
  
    try {
      console.log('Start scraping');
      const browser = await puppeteer.launch( {
         // headless: false, slowMo: 100, // Uncomment to visualize test
      });
       
     
      const page = await browser.newPage();
    
      await page.goto(url);
    
      // Resize window to 1280 x 585
      await page.setViewport({ width: 5120, height: 2341 });
    
      // Click on <button> "View results as a table"
      await page.waitForSelector(btn);
      await page.click(btn);
      let tablesData = [];
      
      let hasNextPage = true;
      // Scrape and paginate (click "Next" until no more pages)
      while (hasNextPage) {
        // Scrape the tables on the current page
        tablesData = tablesData.concat(await scrapeTables2(page));
  
        // Check if the "Next" button exists and click it
        try {
          const nextButton = await page.$(nbtn);
          
          if (nextButton) {
            await nextButton.click();
            console.log('Next button clicked');
  
            // Wait for the page to load again  // Wait for the page to update (you can adjust the timeout)
          } else {
            console.log('No more pages or "Next" button not found');
            hasNextPage = false;  // If "Next" button isn't found, exit the loop
          }
        } catch (error) {
          console.log('Error clicking "Next" button:', error);
          hasNextPage = false;
        }
      }
  
      // Process the tablesData and save to Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scraped Tables');
      let rowIndex = 1;
  
      tablesData.forEach(tableData => {
        tableData.forEach(rowData => {
          worksheet.addRow(rowData);
        });
        rowIndex += tableData.length + 1;
        worksheet.addRow([]); // Add empty row between tables
      });
  
      const timestamp = Date.now();
      const filename = `tables_${timestamp}.xlsx`;
      const filePath = path.join(__dirname, './', filename);
      await workbook.xlsx.writeFile(filePath);
  
      // Send the file to the client
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).send('Failed to download the file');
        } else {
          // Cleanup: Delete the file after sending
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      });
  
      // Close the browser session
      await browser.close();
    } catch (error) {
      console.error('Error scraping the URL:', error);
      res.status(500).send('Failed to scrape tables from the URL');
    }
  });

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
