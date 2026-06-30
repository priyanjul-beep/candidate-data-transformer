import express from 'express';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import { runPipeline } from '../pipeline';

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src/ui/views'));
app.use(express.static(path.join(process.cwd(), 'src/ui/public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function validateRecruiterCsv(filePath: string): { ok: boolean; message: string } {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    const firstLine = text.split('\n')[0]?.trim();
    if (!firstLine) {
      return { ok: false, message: 'CSV is empty.' };
    }
    const header = firstLine.toLowerCase();
    const required = ['name', 'email', 'phone', 'current_company', 'title'];
    const missing = required.filter((h) => !header.includes(h));
    if (missing.length > 0) {
      return { ok: false, message: `CSV missing required headers: ${missing.join(', ')}` };
    }
    return { ok: true, message: 'Valid recruiter CSV.' };
  } catch (e: any) {
    return { ok: false, message: `Invalid CSV: ${e.message}` };
  }
}

function validateAtsJson(filePath: string): { ok: boolean; message: string } {
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, message: 'ATS JSON must be an object.' };
    }
    return { ok: true, message: 'Valid ATS JSON.' };
  } catch (e: any) {
    return { ok: false, message: `Invalid JSON: ${e.message}` };
  }
}

function validateNotesTxt(filePath: string): { ok: boolean; message: string } {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    if (!text.trim()) {
      return { ok: false, message: 'Notes file is empty.' };
    }
    return { ok: true, message: 'Valid notes text file.' };
  } catch (e: any) {
    return { ok: false, message: `Invalid notes file: ${e.message}` };
  }
}

function cleanupUploadedFiles(files: Express.Multer.File[]): void {
  for (const file of files) {
    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {
      // best-effort cleanup
    }
  }
}

app.post('/validate-upload', upload.single('file'), (req: Request, res: Response) => {
  const kind = String(req.body.kind || '');
  const file = req.file;
  if (!file) {
    return res.json({ ok: false, message: 'No file uploaded.' });
  }

  let result = { ok: false, message: 'Unsupported file kind.' };
  if (kind === 'recruiterCsv') {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      result = { ok: false, message: 'Please upload a .csv file.' };
    } else {
      result = validateRecruiterCsv(file.path);
    }
  } else if (kind === 'atsJson') {
    if (!file.originalname.toLowerCase().endsWith('.json')) {
      result = { ok: false, message: 'Please upload a .json file.' };
    } else {
      result = validateAtsJson(file.path);
    }
  } else if (kind === 'notesTxt') {
    if (!file.originalname.toLowerCase().endsWith('.txt')) {
      result = { ok: false, message: 'Please upload a .txt file.' };
    } else {
      result = validateNotesTxt(file.path);
    }
  }

  cleanupUploadedFiles([file]);
  return res.json(result);
});

app.get('/', (_req: Request, res: Response) => {
  const useSamples = true;
  const sampleConfig = fs.readFileSync(path.join(process.cwd(), 'data/samples/custom_config.json'), 'utf-8');
  res.render('index', { useSamples, sampleConfig });
});

app.post(
  '/transform',
  upload.fields([
    { name: 'recruiterCsv', maxCount: 1 },
    { name: 'atsJson', maxCount: 1 },
    { name: 'notesTxt', maxCount: 1 },
  ]),
  (req: Request, res: Response) => {
    const files = req.files as {
      recruiterCsv?: Express.Multer.File[];
      atsJson?: Express.Multer.File[];
      notesTxt?: Express.Multer.File[];
    };

    const useSamples = String(req.body.useSamples) === 'true';
    const configJson = String(req.body.configJson || '');

    const uploadedFiles = [
      ...(files?.recruiterCsv || []),
      ...(files?.atsJson || []),
      ...(files?.notesTxt || []),
    ];

    const recruiterPath = useSamples
      ? path.join(process.cwd(), 'data/samples/recruiter_export.csv')
      : files?.recruiterCsv?.[0]?.path;
    const atsPath = useSamples
      ? path.join(process.cwd(), 'data/samples/ats_blob.json')
      : files?.atsJson?.[0]?.path;
    const notesPath = useSamples
      ? path.join(process.cwd(), 'data/samples/recruiter_notes.txt')
      : files?.notesTxt?.[0]?.path;

    if (!useSamples) {
      const hasStructured = Boolean(recruiterPath || atsPath);
      const hasUnstructured = Boolean(notesPath);
      if (!hasStructured || !hasUnstructured) {
        cleanupUploadedFiles(uploadedFiles);
        return res.json({
          error:
            'Please upload at least one structured source (Recruiter CSV or ATS JSON) and one unstructured source (Notes TXT).',
        });
      }

      if (recruiterPath) {
        const check = validateRecruiterCsv(recruiterPath);
        if (!check.ok) {
          cleanupUploadedFiles(uploadedFiles);
          return res.json({ error: `Recruiter CSV validation failed: ${check.message}` });
        }
      }
      if (atsPath) {
        const check = validateAtsJson(atsPath);
        if (!check.ok) {
          cleanupUploadedFiles(uploadedFiles);
          return res.json({ error: `ATS JSON validation failed: ${check.message}` });
        }
      }
      if (notesPath) {
        const check = validateNotesTxt(notesPath);
        if (!check.ok) {
          cleanupUploadedFiles(uploadedFiles);
          return res.json({ error: `Notes TXT validation failed: ${check.message}` });
        }
      }
    }

    let customConfig = null;
    if (configJson && configJson.trim()) {
      try {
        customConfig = JSON.parse(configJson);
      } catch (e) {
        cleanupUploadedFiles(uploadedFiles);
        return res.json({ error: `Invalid config JSON: ${e}` });
      }
    }

    try {
      const result = runPipeline(recruiterPath, atsPath, notesPath, customConfig);
      cleanupUploadedFiles(uploadedFiles);
      return res.json(result);
    } catch (err: any) {
      cleanupUploadedFiles(uploadedFiles);
      return res.json({ error: err.message });
    }
  }
);

function startServer(port: number): void {
  const server = app
    .listen(port, () => {
      console.log(`UI running at http://localhost:${port}`);
    })
    .on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
        startServer(nextPort);
      } else {
        console.error(err);
        process.exit(1);
      }
    });

  server.on('listening', () => {
    // no-op: keeps explicit server reference for error/listening hooks.
  });
}

startServer(DEFAULT_PORT);
