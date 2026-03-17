import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  try {
    let transporter;
    let isTestAccount = false;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials missing. Falling back to Ethereal Email for testing...');
      // Create a test account on the fly for local testing and debugging
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
      isTestAccount = true;
    } else {
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Project Submission System'}" <${process.env.EMAIL_USER || 'admin@college.edu'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);

    // If using the local ethereal engine, log a URL where the email can be previewed
    if (isTestAccount) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      console.log('--------------------------------------------------');
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export default sendEmail;
