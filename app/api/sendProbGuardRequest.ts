import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';


export interface SendprobguardrequestForm {
  email: string;
  if (req.method === 'POST') {
    const { name: string;
  phone: string;
  request: string;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { name, email, phone, request } = req.body;

    // Nodemailer transport configuration
    const transporter = nodemailer.createTransport({
      host: 'mail5016.site4now.net',
      port: 465,
      secure: true,
      auth: {
        user: 'Customerservice@birdviewinsurance.com',
        pass: 'B!rdv!ew@2024',
      },
    });

    // Email structure
    const subject = `Probation Guard Request - ${name}`;

    const mailOptions = {
      from: '"Birdview Insurance" <Customerservice@birdviewinsurance.com>',
      to: 'Underwriting@birdviewinsurance.com',
      subject,
      html: `
        <h2>Probation Guard Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Request Details:</strong></p>
        <p>${request}</p>
        <hr />
        <p>This message was submitted via the Birdview Probation Guard request form.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Probation Guard request sent successfully.' });
    } catch (error) {
      console.error('Nodemailer Error:', error);
      res.status(500).json({ error: 'Failed to send probation guard request.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}