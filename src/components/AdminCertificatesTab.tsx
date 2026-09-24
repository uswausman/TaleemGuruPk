import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Search, Loader2 } from 'lucide-react';
import { Certificate } from '../types';
import { fetchAdminCertificatesApi, revokeAdminCertificateApi, restoreAdminCertificateApi } from '../lib/api';

export const AdminCertificatesTab: React.FC = () => {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    loadCerts();
  }, []);

  const loadCerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCertificatesApi();
      setCerts(data || []);
    } catch (err) {
      console.error('Failed to fetch certificates', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (cert: Certificate) => {
    setRevoking(cert.certificateId);
    try {
      const isRevoking = cert.status === 'VALID';
      if (isRevoking) {
        await revokeAdminCertificateApi(cert.certificateId, 'Revoked by administrator');
      } else {
        await restoreAdminCertificateApi(cert.certificateId);
      }
      loadCerts();
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Certificate Management</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Certificate ID</th>
              <th className="p-4">Student Name</th>
              <th className="p-4">Test Title</th>
              <th className="p-4">Grade</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {certs.map(cert => (
              <tr key={cert.certificateId} className="border-b">
                <td className="p-4 font-mono text-xs">{cert.certificateId}</td>
                <td className="p-4">{cert.studentName}</td>
                <td className="p-4">{cert.testName}</td>
                <td className="p-4">{cert.grade}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-sm ${cert.status === 'VALID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {cert.status}
                  </span>
                </td>
                <td className="p-4 flex items-center gap-2">
                  <a href={`/verify/${cert.certificateId}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <Search className="w-4 h-4" /> Verify
                  </a>
                  <button 
                    onClick={() => toggleStatus(cert)}
                    disabled={revoking === cert.certificateId}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {revoking === cert.certificateId ? <Loader2 className="animate-spin w-4 h-4" /> : 
                     cert.status === 'VALID' ? <><ShieldAlert className="w-4 h-4" /> Revoke</> : <><ShieldCheck className="w-4 h-4" /> Restore</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
