import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';

export const generateInvoice = async ({ user, plan, payment, purchase }) => {
  const templatePath = path.join(process.cwd(), 'templates', 'invoiceTemplate.ejs');
  const html = await ejs.renderFile(templatePath, { user, plan, payment, purchase });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const invoiceDir = path.join(process.cwd(), 'invoices');
  if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir);

  const filePath = path.join(invoiceDir, `invoice_${payment.id}.pdf`);
  await page.pdf({ path: filePath, format: 'A4' });

  await browser.close();
  return filePath;
};
