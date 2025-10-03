import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as XLSX from 'xlsx';
import path from 'path';


export interface MemberFormForm {
  address: string;
  city: string;
  const { 
      memberidno: string;
  country: number;
  dateofbirth: string;
  dependantsData = []: string;
  eimail: string;
  firstname: string;
  gender: string;
  groupname: string;
  groupnumber: string;
  idno: string;
  idtype: string;
  lastname: string;
  middlename: string;
  mobileno: string;
  relationship: string;
  title: string;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { 
      memberidno, groupname, groupnumber, relationship, title, firstname, lastname,
      middlename, idtype, idno, dateofbirth, gender, country, city, address, mobileno, eimail,
      dependantsData = []
    } = req.body;

    console.log("✅ Received Form Data:", JSON.stringify(req.body, null, 2));
    console.log("✅ Received Dependants Data:", JSON.stringify(dependantsData, null, 2));

    const publicDir = path.join(process.cwd(), 'public');
    await fs.mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, 'member_details.xlsx');
    let workbook;
    let ws1, ws2;

    let fileBuffer = await fs.readFile(filePath).catch(() => null);

    if (fileBuffer) {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      ws1 = workbook.Sheets['Member Details'] || XLSX.utils.aoa_to_sheet([
        ['Member Id Number', 'Group Name', 'Group Number', 'Relationship', 'Title',
        'First Name', 'Last Name', 'Middle Name', 'ID Type', 'ID Number', 
        'Date Of Birth', 'Gender', 'Country', 'City', 'Address', 
        'Mobile Number', 'Email']
      ]);

      ws2 = workbook.Sheets['Dependants Details'] || XLSX.utils.aoa_to_sheet([
        ['Member Id No', 'Dependant ID', 'Relationship', 'Title', 'First Name', 'Middle Name', 'Last Name',
        'ID Type', 'ID Number', 'Date Of Birth', 'Gender', 'Country', 'City']
      ]);
    } else {
      workbook = XLSX.utils.book_new();
      ws1 = XLSX.utils.aoa_to_sheet([
        ['Member Id Number', 'Group Name', 'Group Number', 'Relationship', 'Title',
        'First Name', 'Last Name', 'Middle Name', 'ID Type', 'ID Number', 
        'Date Of Birth', 'Gender', 'Country', 'City', 'Address', 
        'Mobile Number', 'Email']
      ]);
      XLSX.utils.book_append_sheet(workbook, ws1, 'Member Details');

      ws2 = XLSX.utils.aoa_to_sheet([
        ['Member Id No', 'Dependant ID', 'Relationship', 'Title', 'First Name', 'Middle Name', 'Last Name',
        'ID Type', 'ID Number', 'Date Of Birth', 'Gender', 'Country', 'City']
      ]);
      XLSX.utils.book_append_sheet(workbook, ws2, 'Dependants Details');
    }

    const existingMemberData = XLSX.utils.sheet_to_json(ws1, { header: 1 });
    existingMemberData.push([
      memberidno, groupname, groupnumber, relationship, title, firstname, lastname,
      middlename, idtype, idno, dateofbirth, gender, country, city, address, mobileno, eimail,
    ]);
    workbook.Sheets['Member Details'] = XLSX.utils.aoa_to_sheet(existingMemberData);

    const existingDependantsData = XLSX.utils.sheet_to_json(ws2, { header: 1 });

    if (Array.isArray(dependantsData) && dependantsData.length > 0) {
      dependantsData.forEach((dep, index) => {
        if (!dep || !dep.relationship || !dep.firstName || !dep.idnos) {
          console.warn("⚠️ Skipping invalid dependant:", dep);
          return;
        }

        existingDependantsData.push([
          memberidno, index + 1, dep.relationship, dep.title || "", 
          dep.firstName, dep.middleName || "", dep.surname || "", 
          dep.idtypes, dep.idnos, dep.dob, dep.gendere, dep.countrye, dep.cities
        ]);
      });

      console.log("✅ Final Dependants Data for Excel:", existingDependantsData);
    } else {
      console.log("⚠️ No valid dependants data received or array is empty.");
    }

    workbook.Sheets['Dependants Details'] = XLSX.utils.aoa_to_sheet(existingDependantsData);

    const updatedBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    await fs.writeFile(filePath, updatedBuffer);

    const fileUrl = `https://www.birdviewmicroinsurance.com/member_details.xlsx`;

    const transporter = nodemailer.createTransport({
      host: 'mail5016.site4now.net',
      port: 465,
      secure: true,
      auth: {
        user: "customerservice@birdviewinsurance.com",
        pass: "B!rdv!ew@2024",
      },
    });

    const mailOptions = {
      from: '"Birdview Insurance" <customerservice@birdviewinsurance.com>',
      to: ['Gkangwana@birdviewinsurance.com', 'pkihuria@birdviewinsurance.com'],
      subject: `Updated Member Details from ${memberidno} - ${firstname}`,
      text: `Please find the updated Excel sheet with the latest Group and Dependants Details.\n\nTo download the file, click the link below:\n${fileUrl}`,
      attachments: [
        {
          filename: 'member_details.xlsx',
          content: updatedBuffer,
        }
      ],
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Email sent to member");
    } catch (emailError) {
      console.error("⚠️ Email failed to send to member:", emailError);
      const pendingEmailsPath = path.join(publicDir, 'pending_emails.json');
      let pendingEmails = await fs.readFile(pendingEmailsPath, 'utf-8').catch(() => '[]');
      pendingEmails = JSON.parse(pendingEmails);
      pendingEmails.push(mailOptions);
      await fs.writeFile(pendingEmailsPath, JSON.stringify(pendingEmails, null, 2));
      return res.status(202).json({ message: 'Form sent successfully, email to member pending', fileUrl });
    }

    // ✅ Send confirmation email to the member
    const fullName = `${firstname} ${lastname} ${middlename || ''}`.trim();
    const memberSubject = `${memberidno} - ${fullName} | Confirmation of Submission`;

    const memberEmailBody = `
Dear ${fullName},

Thank you for submitting your membership and dependants information. Below is a summary of what we received:

📌 MEMBER DETAILS
- Member ID No: ${memberidno}
- Group Name: ${groupname}
- Group Number: ${groupnumber}
- Relationship: ${relationship}
- Title: ${title}
- First Name: ${firstname}
- Middle Name: ${middlename || '-'}
- Last Name: ${lastname}
- ID Type: ${idtype}
- ID Number: ${idno}
- Date of Birth: ${dateofbirth}
- Gender: ${gender}
- Country: ${country}
- City: ${city}
- Address: ${address}
- Mobile No: ${mobileno}
- Email: ${eimail}

📌 DEPENDANTS DETAILS
${dependantsData && dependantsData.length > 0 
  ? dependantsData.map((d, i) => `
Dependant ${i + 1}:
- Relationship: ${d.relationship}
- Title: ${d.title || '-'}
- First Name: ${d.firstName}
- Middle Name: ${d.middleName || '-'}
- Last Name: ${d.surname || '-'}
- ID Type: ${d.idtypes}
- ID Number: ${d.idnos}
- Date of Birth: ${d.dob}
- Gender: ${d.gendere}
- Country: ${d.countrye}
- City: ${d.cities}
`).join('\n')
  : 'No dependants information provided.'}

If you have any questions, feel free to reach out to us.

Warm regards,  
Birdview Insurance
`;

    const memberMailOptions = {
      from: '"Birdview Insurance" <customerservice@birdviewinsurance.com>',
      to: eimail,
      subject: memberSubject,
      text: memberEmailBody,
    };

    try {
      await transporter.sendMail(memberMailOptions);
      console.log("✅ Confirmation email sent to member:", eimail);
    } catch (memberEmailErr) {
      console.error("⚠️ Failed to send confirmation email to member:", memberEmailErr);
    }

    return res.status(200).json({ message: 'Form sent successfully', fileUrl });
  } catch (error) {
    console.error("❌ Full Error Details:", error);
    return res.status(500).json({ error: error.message || 'Unknown error occurred' });
  }
}