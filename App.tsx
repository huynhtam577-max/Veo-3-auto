import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Job, JobConfig, JobStatus } from './types';
import JobForm from './components/JobForm';
import JobRow from './components/JobRow';
import { fetchVideoBlob, generateVideoJob } from './services/geminiService';

// -- Constants for Queue Management --
const MAX_CONCURRENT_JOBS = 4;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_STARTS_PER_WINDOW = 4; // Max 4 jobs per minute

const App: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [queueStarts, setQueueStarts] = useState<number[]>([]); // Timestamps of when jobs started
  
  // Refs for checking current state inside interval
  const jobsRef = useRef<Job[]>([]);
  jobsRef.current = jobs;
  
  const queueStartsRef = useRef<number[]>([]);
  queueStartsRef.current = queueStarts;

  // -- API Key Logic --
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setApiKeySet(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Guidelines: "Assume the key selection was successful after triggering openSelectKey()"
        // Do not check return value as it might be void or suffer from race condition.
        setApiKeySet(true);
    }
  };

  // -- Job Management --

  const addJobs = (config: JobConfig, count: number) => {
    const newJobs: Job[] = Array.from({ length: count }).map(() => ({
      id: crypto.randomUUID(),
      config: { ...config }, // Clone config
      status: JobStatus.PENDING,
      createdAt: Date.now(),
    }));
    setJobs(prev => [...prev, ...newJobs]);
  };

  const updateJobStatus = (id: string, status: JobStatus, updates?: Partial<Job>) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, status, ...updates } : job
    ));
  };

  const handleRetry = (id: string) => {
    updateJobStatus(id, JobStatus.PENDING, { error: undefined });
  };

  // -- Queue Processor --
  // We use a tick based approach to manage complex rate limiting
  useEffect(() => {
    const interval = setInterval(() => {
      processQueue();
    }, 1000); // Check every second
    return () => clearInterval(interval);
  }, []);

  const processQueue = useCallback(async () => {
    const currentJobs = jobsRef.current;
    const currentStarts = queueStartsRef.current;
    const now = Date.now();

    // 1. Cleanup old start timestamps
    const validStarts = currentStarts.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (validStarts.length !== currentStarts.length) {
      setQueueStarts(validStarts);
      return; // Wait for next tick to ensure state sync
    }

    // 2. Check Constraints
    const processingJobs = currentJobs.filter(j => j.status === JobStatus.PROCESSING);
    
    // Constraint: Max concurrent
    if (processingJobs.length >= MAX_CONCURRENT_JOBS) return;

    // Constraint: Max starts per minute
    if (validStarts.length >= MAX_STARTS_PER_WINDOW) return;

    // 3. Find candidate
    const candidate = currentJobs.find(j => j.status === JobStatus.PENDING);
    if (!candidate) return;

    // 4. Start Job
    startJob(candidate.id);

  }, []);

  const startJob = async (id: string) => {
    // Optimistic update to block double-processing
    // We update state immediately so the next tick sees it as processing
    updateJobStatus(id, JobStatus.PROCESSING, { startedAt: Date.now() });
    
    // Record start time for rate limiting
    setQueueStarts(prev => [...prev, Date.now()]);

    const job = jobsRef.current.find(j => j.id === id);
    if (!job) return;

    try {
        const uri = await generateVideoJob(job.config);
        
        // Success! Now fetch the blob for the player
        const blobUrl = await fetchVideoBlob(uri);
        
        updateJobStatus(id, JobStatus.COMPLETED, { 
            completedAt: Date.now(),
            videoUri: uri,
            downloadUrl: blobUrl
        });

    } catch (err: any) {
        updateJobStatus(id, JobStatus.FAILED, { 
            error: err.message || "Unknown error occurred" 
        });
    }
  };

  // -- Download Logic --
  const handleDownload = (job: Job) => {
    if (job.downloadUrl) {
        const a = document.createElement('a');
        a.href = job.downloadUrl;
        a.download = `veo-gen-${job.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
  };

  const handleDownloadAll = () => {
    const completed = jobs.filter(j => j.status === JobStatus.COMPLETED && j.downloadUrl);
    
    // Stagger downloads to avoid browser blocking
    completed.forEach((job, index) => {
        setTimeout(() => handleDownload(job), index * 500);
    });
  };

  // -- Stats --
  const pendingCount = jobs.filter(j => j.status === JobStatus.PENDING).length;
  const processingCount = jobs.filter(j => j.status === JobStatus.PROCESSING).length;
  const completedCount = jobs.filter(j => j.status === JobStatus.COMPLETED).length;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Veo Batch Studio
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Google Gemini Video Generation Pipeline
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                {!apiKeySet ? (
                    <button 
                        onClick={handleSelectKey}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded shadow-lg animate-bounce"
                    >
                        ⚠ Select API Key
                    </button>
                ) : (
                     <div className="flex items-center gap-2 text-green-400 bg-green-900/30 px-3 py-1 rounded border border-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        API Connected
                     </div>
                )}
            </div>
        </header>

        {/* API Warning if not set */}
        {!apiKeySet && (
            <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded mb-8 text-yellow-200">
                <p><strong>Action Required:</strong> Please select a paid Google Cloud Project API key to use Veo models. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-white">Learn about billing</a>.</p>
            </div>
        )}

        {/* Main Content */}
        {apiKeySet && (
            <>
                <JobForm onAddJob={addJobs} />

                {/* Queue Stats Bar */}
                <div className="flex flex-wrap items-center justify-between bg-gray-800 p-4 rounded-t-lg border-b border-gray-700">
                    <div className="flex gap-6 text-sm">
                        <span className="text-gray-400">Total: <b className="text-white">{jobs.length}</b></span>
                        <span className="text-blue-400">Processing: <b className="text-white">{processingCount}</b> / {MAX_CONCURRENT_JOBS}</span>
                        <span className="text-yellow-400">Pending: <b className="text-white">{pendingCount}</b></span>
                        <span className="text-green-400">Completed: <b className="text-white">{completedCount}</b></span>
                    </div>
                    
                    {completedCount > 0 && (
                        <button 
                            onClick={handleDownloadAll}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                            Download All Completed
                        </button>
                    )}
                </div>

                {/* Job Table */}
                <div className="bg-gray-800 rounded-b-lg shadow overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Prompt & Config</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Result</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        Queue is empty. Add a job above to start.
                                    </td>
                                </tr>
                            ) : (
                                jobs.map(job => (
                                    <JobRow 
                                        key={job.id} 
                                        job={job} 
                                        onRetry={handleRetry} 
                                        onDownload={handleDownload} 
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default App;