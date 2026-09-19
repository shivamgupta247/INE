import { Resend } from 'resend';
import config from '../config/index.js';

let resend;
if (config.resend.apiKey) {
  resend = new Resend(config.resend.apiKey);
}

const fromEmail = config.resend.fromEmail;
const alertEmail = config.resend.alertEmail;

/**
 * Helper to send emails
 */
async function sendEmail(subject, htmlContent) {
  if (!config.resend.apiKey) {
    console.log(`[EmailService] SKIP EMAIL: Resend API key is not configured. Subject: ${subject}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `INE Price Tracker <${fromEmail}>`,
      to: [alertEmail],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error(`[EmailService] Failed to send email via Resend:`, error);
      return;
    }

    console.log(`[EmailService] Alert email sent successfully to ${alertEmail}. ID: ${data?.id}`);
  } catch (err) {
    console.error(`[EmailService] Unexpected error sending email:`, err.message);
  }
}

/**
 * Send an alert for a price drop
 */
export async function sendPriceDropAlert(product, oldPrice, newPrice, currency) {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  const subject = `🚨 Price Drop Alert: ${product.name} is now ${currency} ${newPrice}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Price Drop Alert! 🎉</h2>
      <p>Good news! A product you are tracking has dropped in price.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e293b;">${product.name}</h3>
        <p><strong>Old Price:</strong> <span style="text-decoration: line-through; color: #64748b;">${currency} ${oldPrice}</span></p>
        <p><strong>New Price:</strong> <span style="font-size: 24px; font-weight: bold; color: #10b981;">${currency} ${newPrice}</span></p>
        <p><strong>Discount:</strong> <span style="background-color: #fef08a; padding: 3px 8px; border-radius: 4px; font-weight: bold; color: #854d0e;">${discount}% OFF</span></p>
      </div>
      
      <p>Click <a href="${config.frontendUrl}/product/${product.id}" style="color: #4f46e5; font-weight: bold;">here</a> to view the product details on your dashboard.</p>
    </div>
  `;
  
  await sendEmail(subject, html);
}

/**
 * Send an alert for an item coming back in stock
 */
export async function sendBackInStockAlert(product, price, currency) {
  const subject = `📦 Back in Stock Alert: ${product.name}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #059669;">Back in Stock! 📦</h2>
      <p>A product you are tracking is finally back in stock.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e293b;">${product.name}</h3>
        <p><strong>Current Price:</strong> <span style="font-size: 20px; font-weight: bold; color: #0f172a;">${currency} ${price}</span></p>
        <p><strong>Status:</strong> <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: bold;">IN STOCK</span></p>
      </div>
      
      <p>Click <a href="${config.frontendUrl}/product/${product.id}" style="color: #4f46e5; font-weight: bold;">here</a> to view the product details on your dashboard.</p>
    </div>
  `;
  
  await sendEmail(subject, html);
}
