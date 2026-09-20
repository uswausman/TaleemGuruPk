import React, { useEffect, useState } from 'react';
import { Award, AlertTriangle, CheckCircle } from 'lucide-react';

export const CertificateVerificationView: React.FC = () => {
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const certificateId = window.location.pathname.split('/').pop();

  useEffect(() => {
    const verifyCert = async () => {
      try {
        const response = await fetch(`/api/certificates/verify/${encodeURIComponent(certificateId!)}`);
        const data = await response.json();
        if (data.verified) {
          setCert(data);
        } else {
          setError(data.error || 'Certificate not found');
        }
      } catch (err) {
        setError('Verification failed');
      } finally {
        setLoading(false);
      }
    };
    verifyCert();
  }, [certificateId]);

  if (loading) return <div className="p-8 text-center text-gray-500">Verifying certificate authenticity...</div>;
  if (error) return (
    <div className="p-8 max-w-lg mx-auto bg-white rounded-lg shadow-sm border border-red-100 text-center">
      <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-red-700 mb-2">Certificate Invalid</h2>
      <p className="text-gray-600">{error}</p>
    </div>
  );

  const isRevoked = cert.status === 'REVOKED';

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center mb-8">
        {isRevoked ? (
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        ) : (
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        )}
        <h1 className="text-3xl font-bold text-gray-900">
          {isRevoked ? 'Certificate Revoked' : 'Certificate Authenticated'}
        </h1>
        <p className={`text-lg font-semibold mt-2 ${isRevoked ? 'text-amber-700' : 'text-green-700'}`}>
          {isRevoked ? 'This certificate is no longer valid.' : 'This certificate is authentic.'}
        </p>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <p className="text-gray-600"><strong>Student:</strong></p>
          <p className="font-medium text-gray-900">{cert.studentName}</p>
          
          <p className="text-gray-600"><strong>Test:</strong></p>
          <p className="font-medium text-gray-900">{cert.testName}</p>
          
          <p className="text-gray-600"><strong>Class:</strong></p>
          <p className="font-medium text-gray-900">{cert.className || 'N/A'}</p>
          
          <p className="text-gray-600"><strong>Subject:</strong></p>
          <p className="font-medium text-gray-900">{cert.subject || 'N/A'}</p>
          
          <p className="text-gray-600"><strong>Issue Date:</strong></p>
          <p className="font-medium text-gray-900">{new Date(cert.issueDate).toLocaleDateString()}</p>
        </div>
        <div className="border-t border-gray-200 pt-4 mt-4">
          <p className="text-sm text-gray-500"><strong>Certificate ID:</strong> {cert.certificateId}</p>
        </div>
      </div>
    </div>
  );
};
