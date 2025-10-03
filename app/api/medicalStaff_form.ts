import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as XLSX from 'xlsx';
import path from 'path';


export interface MedicalstaffFormForm {
  address: string;
  city: string;
  const { 
      policyScheme: string;
  country: number;
  dateofbirth: string;
  dependantsData = []: string;
  eimail: string;
  firstname: string;
  gender: string;
  idno: string;
  idtype: string;
  lastname: string;
  middleName: string;
  mobileno: string;
  relationship: string;
  staffId: string;
  title: string;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { 
      policyScheme, relationship, title, staffId, firstname, middleName, lastname, idtype,
      idno, dateofbirth, gender, country, city, address, mobileno, eimail,
      dependantsData = []
    } = req.body;

    console.log("Received Dependants Data:", dependantsData); // ✅ Fixed log message

    const publicDir = path.join(process.cwd(), 'public');
    await fs.mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, 'staffMember_data.xlsx');
    let workbook;
    let ws1, ws2;

    let fileBuffer = await fs.readFile(filePath).catch(() => null);

    if (fileBuffer) {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      ws1 = workbook.Sheets['Staff Member Details'] || XLSX.utils.aoa_to_sheet([
        ['Policy Scheme', 'Relationship', 'Title', 'Staff Id',
        'First Name', 'Middle Name', 'Last Name', 'ID Type', 'ID Number', 
        'Date Of Birth', 'Gender', 'Country', 'City', 'Address', 
        'Mobile Number', 'Email']
      ]);
      ws2 = workbook.Sheets['Dependants Details'] || XLSX.utils.aoa_to_sheet([
        ['Dependant Id', 'ID', 'Relationship', 'Title', 'First Name', 'Middle Name', 'Last Name',
        'ID Type', 'ID Number', 'Date Of Birth', 'Gender']
      ]);
    } else {
      workbook = XLSX.utils.book_new();
      ws1 = XLSX.utils.aoa_to_sheet([
        ['Policy Scheme', 'Relationship', 'Title', 'Staff Id',
        'First Name', 'Middle Name', 'Last Name', 'ID Type', 'ID Number', 
        'Date Of Birth', 'Gender', 'Country', 'City', 'Address', 
        'Mobile Number', 'Email']
      ]);
      XLSX.utils.book_append_sheet(workbook, ws1, 'Staff Member Details');

      ws2 = XLSX.utils.aoa_to_sheet([
        ['Dependant Id', 'ID', 'Relationship', 'Title', 'First Name', 'Middle Name', 'Last Name',
        'ID Type', 'ID Number', 'Date Of Birth', 'Gender']
      ]);
      XLSX.utils.book_append_sheet(workbook, ws2, 'Dependants Details');
    }

    const existingMemberData = XLSX.utils.sheet_to_json(ws1, { header: 1 });
    existingMemberData.push([
      policyScheme, relationship, title, staffId, 
      firstname, middleName, lastname, idtype, idno, dateofbirth,
      gender, country, city, address, mobileno, eimail
    ]);
    workbook.Sheets['Staff Member Details'] = XLSX.utils.aoa_to_sheet(existingMemberData);

    const existingDependantsData = XLSX.utils.sheet_to_json(ws2, { header: 1 });

    if (Array.isArray(dependantsData) && dependantsData.length > 0) {
      dependantsData.forEach((dep, index) => {
        existingDependantsData.push([
          `${staffId}-${index + 1}`, index + 1, dep.relationship, dep.title, dep.firstName, dep.middleName, dep.surname, 
          dep.idtypes, dep.idnos, dep.dob, dep.gendere
        ]);
      });
    } else {
      console.log("No dependants data received or empty array."); // ✅ Added validation log
    }

    workbook.Sheets['Dependants Details'] = XLSX.utils.aoa_to_sheet(existingDependantsData);

    const updatedBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    await fs.writeFile(filePath, updatedBuffer);

    const fileUrl = `https://www.birdviewmicroinsurance.com/staffMember_data.xlsx`;
    const mailOptions = {
      from: '"Birdview Insurance" <customerservice@birdviewinsurance.com>',
      to: 'jnyakundi@birdviewinsurance.com',
      cc: 'jkimani@birdviewinsurance.com',
      subject: `Updated Staff Member Details from ${firstname} - ${policyScheme}`,
      text: `Please find the updated Excel sheet with the latest Group and Dependants Details.
    
    To download the file, click the link below:
    ${fileUrl}`,
      attachments: [
        {
          filename: 'staffMember_data.xlsx',
          content: updatedBuffer, 
        }
      ],
    };

    const transporter = nodemailer.createTransport({
      host: 'mail5016.site4now.net',
      port: 465,
      secure: true,
      auth: {
        user: "customerservice@birdviewinsurance.com",
        pass: "B!rdv!ew@2024",
      },
    });

    try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: 'Form sent successfully' });
    } catch (emailError) {
      console.error("Email failed to send, storing for retry:", emailError);
      const pendingEmailsPath = path.join(publicDir, 'pending_emails.json');
      let pendingEmails = await fs.readFile(pendingEmailsPath, 'utf-8').catch(() => '[]');
      pendingEmails = JSON.parse(pendingEmails);
      pendingEmails.push(mailOptions);
      await fs.writeFile(pendingEmailsPath, JSON.stringify(pendingEmails, null, 2));
      return res.status(202).json({ message: 'Form sent successfully', fileUrl });
    }
  } catch (error) {
    console.error("Full Error Details:", error);
    return res.status(500).json({ error: error.message || 'Unknown error occurred' });
  }
}