import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as XLSX from 'xlsx';
import path from 'path';
import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const publicDir = path.join(process.cwd(), 'public');
  const uploadDir = path.join(publicDir, 'uploads');
  const filePath = path.join(publicDir, 'kenyan-oxfordshire-men-welfare.xlsx');

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await fs.mkdir(uploadDir, { recursive: true });

    const form = new IncomingForm({ multiples: true, uploadDir, keepExtensions: true });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    console.log("📝 Raw fields received:", fields);

    const {
      memberidno, groupname, groupnumber, title, firstname, lastname,
      middlename, idtype, idno, dateofbirth, gender, country, city, address,
      mobileno, eimail, family_option, option,
    } = fields;

    let dependantsData = [];
    try {
      dependantsData = JSON.parse(fields.dependantsData || '[]');
      console.log("👨‍👩‍👧 Dependants parsed:", dependantsData);
    } catch (err) {
      console.warn("⚠️ Invalid dependantsData JSON");
    }

    let beneficiariesData = [];
    try {
      beneficiariesData = JSON.parse(fields.beneficiariesData || '[]');
      console.log("🎯 Beneficiaries parsed:", beneficiariesData);
    } catch (err) {
      console.warn("⚠️ Invalid beneficiariesData JSON");
    }

    let workbook;
    const fileBuffer = await fs.readFile(filePath).catch(() => null);
    if (fileBuffer) {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } else {
      workbook = XLSX.utils.book_new();
    }

    const memberHeaders = [
      'Member Id Number', 'Group Name', 'Group Number', 'Title', 'First Name',
      'Last Name', 'Middle Name', 'ID Type', 'ID Number', 'Date Of Birth', 'Gender',
      'Country', 'City', 'Address', 'Mobile Number', 'Email', 'Family Option', 'Option'
    ];
    let memberSheetData = workbook.Sheets['Member Details']
      ? XLSX.utils.sheet_to_json(workbook.Sheets['Member Details'], { header: 1 })
      : [memberHeaders];

    memberSheetData.push([
      memberidno, groupname, groupnumber, title, firstname, lastname, middlename,
      idtype, idno, dateofbirth, gender, country, city, address,
      mobileno, eimail, family_option, option
    ]);

    const memberSheet = XLSX.utils.aoa_to_sheet(memberSheetData);
    workbook.Sheets['Member Details'] = memberSheet;
    if (!workbook.SheetNames.includes('Member Details')) {
      XLSX.utils.book_append_sheet(workbook, memberSheet, 'Member Details');
    }

    const depHeaders = [
      'Member Id No', 'ID', 'Relationship', 'Title', 'First Name', 'Middle Name',
      'Last Name', 'ID Type', 'ID Number', 'Date Of Birth', 'Gender', 'Country', 'City'
    ];
    let depSheetData = workbook.Sheets['Dependants Details']
      ? XLSX.utils.sheet_to_json(workbook.Sheets['Dependants Details'], { header: 1 })
      : [depHeaders];

    dependantsData.forEach((dep, index) => {
      if (!dep || !dep.relationship || !dep.firstName || !dep.idnos) {
        console.warn(`⚠️ Skipping invalid dependant at index ${index}`, dep);
        return;
      }
      depSheetData.push([
        memberidno, depSheetData.length, dep.relationship, dep.title || '',
        dep.firstName, dep.middleName || '', dep.surname || '',
        dep.idtypes, dep.idnos, dep.dob, dep.gendere, dep.countrye, dep.cities
      ]);
    });

    const depSheet = XLSX.utils.aoa_to_sheet(depSheetData);
    workbook.Sheets['Dependants Details'] = depSheet;
    if (!workbook.SheetNames.includes('Dependants Details')) {
      XLSX.utils.book_append_sheet(workbook, depSheet, 'Dependants Details');
    }

    const benHeaders = [
      'Member Id No', 'ID', 'Relationship', 'Title', 'Full Name',
      'Date Of Birth', 'Phone Number', 'Address', 'Email'
    ];
    let benSheetData = workbook.Sheets['Beneficiaries Info']
      ? XLSX.utils.sheet_to_json(workbook.Sheets['Beneficiaries Info'], { header: 1 })
      : [benHeaders];

    beneficiariesData.forEach((ben, index) => {
      if (!ben || !ben.relationship || !ben.beneficiary_fullname) {
        console.warn(`⚠️ Skipping invalid beneficiary at index ${index}`, ben);
        return;
      }
      benSheetData.push([
        memberidno, benSheetData.length, ben.relationship, ben.title || '',
        ben.beneficiary_fullname, ben.dob, ben.phone_number || '',
        ben.beneficiary_address || '', ben.beneficiary_email || ''
      ]);
    });

    const benSheet = XLSX.utils.aoa_to_sheet(benSheetData);
    workbook.Sheets['Beneficiaries Info'] = benSheet;
    if (!workbook.SheetNames.includes('Beneficiaries Info')) {
      XLSX.utils.book_append_sheet(workbook, benSheet, 'Beneficiaries Info');
    }

    const updatedBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    await fs.writeFile(filePath, updatedBuffer);
    console.log("✅ Excel file updated successfully");

    const fileUrl = `https://www.birdviewmicroinsurance.com/kenyan-oxfordshire-men-welfare.xlsx`;
    const transporter = nodemailer.createTransport({
      host: 'mail5016.site4now.net',
      port: 465,
      secure: true,
      auth: {
        user: "customerservice@birdviewinsurance.com",
        pass: "B!rdv!ew@2024",
      },
    });

    const attachments = [
      {
        filename: 'kenyan-oxfordshire-men-welfare.xlsx',
        content: updatedBuffer,
      },
    ];

    const uploads = files.supportingDocuments;
    if (uploads) {
      const uploadArray = Array.isArray(uploads) ? uploads : [uploads];
      uploadArray.forEach(file => {
        attachments.push({
          filename: file.originalFilename,
          path: file.filepath,
        });
      });
    }

    const adminMailOptions = {
      from: '"Birdview Insurance" <customerservice@birdviewinsurance.com>',
      to: ['Gkangwana@birdviewinsurance.com', 'pkihuria@birdviewinsurance.com',
          'customerservice@birdviewinsurance.com', 'akinyanjui@birdviewinsurance.com'],
      subject: `Updated Member Details from ${memberidno} - ${firstname}`,
      text: `Please find the updated Excel sheet.\nDownload link:\n${fileUrl}`,
      attachments,
    };

    try {
      await transporter.sendMail(adminMailOptions);
    } catch (emailError) {
      console.error("⚠️ Admin email failed:", emailError);
    }

    const fullName = `${firstname} ${lastname} ${middlename || ''}`.trim();
    const memberSubject = `${memberidno} - ${fullName} | Confirmation of Submission`;
    const memberEmailBody = `
Dear ${fullName},

Thank you for your submission.

📌 MEMBER DETAILS
- Member ID: ${memberidno}
- Group: ${groupname} (${groupnumber})
- Name: ${title} ${firstname} ${middlename || ''} ${lastname}
- ID: ${idtype} ${idno}
- DOB: ${dateofbirth}
- Gender: ${gender}
- Contact: ${mobileno}, ${eimail}
- Location: ${address}, ${city}, ${country}
- Family Option: ${family_option}
- Option : ${option}

📌 DEPENDANTS
${dependantsData.length > 0 ? dependantsData.map((d, i) => `
Dependant ${i + 1}:
- ${d.relationship} - ${d.title || ''} ${d.firstName} ${d.middleName || ''} ${d.surname || ''}`).join('\n') : 'None'}

📌 BENEFICIARIES
${beneficiariesData.length > 0 ? beneficiariesData.map((b, i) => `
Beneficiary ${i + 1}:
- ${b.relationship} - ${b.title || ''} ${b.beneficiary_fullname}
- Phone: ${b.phone_number || ''} | Email: ${b.beneficiary_email || ''}`).join('\n') : 'None'}

📌 PAYMENT INSTRUCTIONS

Please make your membership payment using the bank details below:

Account Name: CITYBOXCOURIERS  
Sort code: 55 50 28  
Account Number: 70161909

⚠️ IMPORTANT: Use your Member ID Number (${memberidno}) as the Reference Number.

⚠️ NOTE: Policy will be effective after uploading proof of payment.

Warm regards,  
Birdview Insurance`.trim();

    try {
      await transporter.sendMail({
        from: '"Birdview Insurance" <customerservice@birdviewinsurance.com>',
        to: eimail,
        subject: memberSubject,
        text: memberEmailBody,
      });
    } catch (memberEmailErr) {
      console.error("⚠️ Member email failed:", memberEmailErr);
    }

    return res.status(200).json({ message: 'Form sent successfully', fileUrl, reset: true });
  } catch (error) {
    console.error("❌ Error in handler:", error);
    return res.status(500).json({ error: error.message || 'Unknown server error' });
  }
}
