import { config } from 'dotenv';
import { ZoomAPI } from './src/infrastructure/zoom/ZoomApi';
import express from 'express';
import type { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

config(); // Load environment variables from .env file

const app = express();

// Config Base
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 3000;

// ZoomConfig
const {
  ZOOM_AUTH_API_URL,
  ZOOM_BASE_API_URL,
  ZOOM_ACCOUNT_ID,
  ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET,
} = process.env;

const zoomConfig = {
  ZOOM_AUTH_API_URL: ZOOM_AUTH_API_URL || '',
  ZOOM_BASE_API_URL: ZOOM_BASE_API_URL || '',
  ZOOM_ACCOUNT_ID: ZOOM_ACCOUNT_ID || '',
  ZOOM_CLIENT_ID: ZOOM_CLIENT_ID || '',
  ZOOM_CLIENT_SECRET: ZOOM_CLIENT_SECRET || '',
};

const zoomAPI = new ZoomAPI(zoomConfig);

// RouteBase POC
app.get('/', (_req: Request, _res: Response) => {
  _res.json({
    code: 200,
    message: {
      status: 'SUCCESS',
      health: 'GOOD',
    },
  });
});

app.post('/meet', async (_req: Request, _res: Response) => {
  const { topic } = _req.body;

  const response: any = await zoomAPI.createMeeting(topic);

  const zoomResponse = {
    meetId: response.id,
    topic: response.topic,
  };

  _res.status(201).json({
    code: 201,
    message: {
      status: 'SUCCESS',
      zoomResponse,
    },
  });
});

app.post('/meet/signature', (_req: Request, _res: Response) => {
  const { meetingNumber, role } = _req.body;

  const signature = zoomAPI.generateZoomSignature(
    Number(meetingNumber),
    Number(role)
  );
  _res.status(200).json({
    code: 200,
    message: {
      signature,
    },
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
