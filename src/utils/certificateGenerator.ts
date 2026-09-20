import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Certificate } from '../types';

export const generateCertificatePDF = async (certificate: Certificate): Promise<ArrayBuffer> => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Generate QR code data URL
  const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl, {
    width: 150,
    margin: 2,
  });

  // Simplified certificate design logic
  doc.setFontSize(30);
  doc.text('CERTIFICATE OF ACHIEVEMENT', 148, 40, { align: 'center' });
  doc.setFontSize(20);
  doc.text(`This is to certify that ${certificate.studentName}`, 148, 70, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`has successfully completed the ${certificate.testName}`, 148, 90, { align: 'center' });
  doc.text(`in the subject of ${certificate.subject} (${certificate.className})`, 148, 100, { align: 'center' });
  doc.text(`with a score of ${certificate.score}/${certificate.totalMarks} (${certificate.percentage}%)`, 148, 110, { align: 'center' });
  doc.text(`Grade: ${certificate.grade} - ${certificate.performanceLevel}`, 148, 120, { align: 'center' });
  doc.text(`Issue Date: ${certificate.issueDate} ${certificate.issueTime}`, 148, 140, { align: 'center' });

  // Add QR Code
  doc.addImage(qrDataUrl, 'PNG', 240, 150, 40, 40);
  
  doc.setFontSize(10);
  doc.text(`Certificate ID: ${certificate.certificateId}`, 20, 190);

  return doc.output('arraybuffer');
};

export const generateUniqueCertificateId = () => {
    return `TG-CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};
