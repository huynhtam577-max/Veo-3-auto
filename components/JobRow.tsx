import React from 'react';
import { Job, JobStatus } from '../types';

interface JobRowProps {
  job: Job;
  onRetry: (id: string) => void;
  onDownload: (job: Job) => void;
}

const JobRow: React.FC<JobRowProps> = ({ job, onRetry, onDownload }) => {
  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.PENDING: return 'text-gray-400 bg-gray-800';
      case JobStatus.PROCESSING: return 'text-blue-400 bg-blue-900/20 animate-pulse';
      case JobStatus.COMPLETED: return 'text-green-400 bg-green-900/20';
      case JobStatus.FAILED: return 'text-red-400 bg-red-900/20';
    }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString();

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
      <td className="p-4 text-xs font-mono text-gray-500 w-16 truncate">{job.id.slice(0, 8)}</td>
      <td className="p-4">
        <div className="text-sm font-medium text-white line-clamp-2 w-64 md:w-96" title={job.config.prompt}>
            {job.config.prompt}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex gap-2">
            <span className="bg-gray-700 px-1 rounded">{job.config.model.split('-')[2]}</span>
            <span className="bg-gray-700 px-1 rounded">{job.config.aspectRatio}</span>
            {job.config.inputType === 'Text + Image' && <span className="bg-purple-900/50 text-purple-300 px-1 rounded">Img</span>}
        </div>
      </td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(job.status)}`}>
          {job.status}
        </span>
        {job.error && (
            <div className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={job.error}>
                {job.error}
            </div>
        )}
      </td>
      <td className="p-4 w-64">
        {job.status === JobStatus.COMPLETED && job.downloadUrl ? (
            <div className="relative group w-48 aspect-video bg-black rounded overflow-hidden">
                <video 
                    src={job.downloadUrl} 
                    controls 
                    className="w-full h-full object-contain"
                />
            </div>
        ) : job.status === JobStatus.PROCESSING ? (
            <div className="w-48 aspect-video bg-gray-800 rounded flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        ) : (
            <div className="w-48 aspect-video bg-gray-800/30 rounded flex items-center justify-center text-gray-600 text-xs">
                Waiting...
            </div>
        )}
      </td>
      <td className="p-4 text-right">
        {job.status === JobStatus.FAILED && (
            <button 
                onClick={() => onRetry(job.id)}
                className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded mr-2"
            >
                Retry
            </button>
        )}
        {job.status === JobStatus.COMPLETED && (
            <button 
                onClick={() => onDownload(job)}
                className="text-sm bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1 inline-flex"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Download
            </button>
        )}
      </td>
    </tr>
  );
};

export default JobRow;
