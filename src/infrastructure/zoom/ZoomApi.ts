import ky, { type KyInstance } from 'ky';
import { KJUR } from 'jsrsasign';

/**
 * ZoomAPI class
 * @class ZoomAPI
 * @param {string} apiKey - The API key for Zoom
 * @returns {void}
 * @example
 * const zoom = new ZoomAPI('my-api);
 */
export class ZoomAPI {
  // Base Core KY
  private zoomServerInstance: KyInstance;
  private zoomAPIUrl: string;
  private zoomSDKKey: string = process.env.ZOOM_SDK_KEY || '';
  private zoomSDKSecret: string = process.env.ZOOM_SDK_SECRET || '';

  // Zoom Token Base
  private ZOOM_OAUTH_TOKEN?: string;
  private ZOOM_OAUTH_EXPIRE?: EpochTimeStamp;

  //Configuration Base
  private _config: {
    ZOOM_AUTH_API_URL: string;
    ZOOM_BASE_API_URL: string;
    ZOOM_ACCOUNT_ID: string;
    ZOOM_CLIENT_ID: string;
    ZOOM_CLIENT_SECRET: string;
  };

  constructor(config: {
    ZOOM_AUTH_API_URL: string;
    ZOOM_BASE_API_URL: string;
    ZOOM_ACCOUNT_ID: string;
    ZOOM_CLIENT_ID: string;
    ZOOM_CLIENT_SECRET: string;
  }) {
    this._config = config;
    this.zoomAPIUrl = config.ZOOM_BASE_API_URL;
    this.zoomServerInstance = ky.create({
      prefixUrl: this.zoomAPIUrl,
      hooks: {
        beforeRequest: [
          async (request) => {
            // Get token
            if (
              !this.ZOOM_OAUTH_TOKEN ||
              (this.ZOOM_OAUTH_EXPIRE as number) < +new Date()
            )
              await this.oAuthToken();

            request.headers.set(
              'Authorization',
              `Bearer ${this.ZOOM_OAUTH_TOKEN}`
            );
          },
        ],
        // afterResponse: [],
      },
      retry: {
        limit: 3,
        methods: ['get', 'post', 'put', 'patch', 'delete'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
        maxRetryAfter: 10,
      },
      timeout: 10000,
    });
  }

  private async oAuthToken() {
    const {
      ZOOM_AUTH_API_URL,
      ZOOM_ACCOUNT_ID,
      ZOOM_CLIENT_ID,
      ZOOM_CLIENT_SECRET,
    } = this._config;

    try {
      console.info('Generate new OAuth token');
      const response = await ky.post(ZOOM_AUTH_API_URL || '', {
        searchParams: {
          grant_type: 'account_credentials',
          account_id: ZOOM_ACCOUNT_ID || '',
        },
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      });

      const token: {
        access_token: string;
        expires_in: number;
      } = await response.json();

      this.ZOOM_OAUTH_TOKEN = token.access_token;
      this.ZOOM_OAUTH_EXPIRE = +new Date() + token.expires_in;
      console.info(`Success Generate new OAuth token`);
    } catch (error) {
      console.error(`Have some this error`, { error });
    }
  }

  generateZoomSignature(
    meetingNumber: number,
    role: number,
    expirationSeconds?: number
  ): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = expirationSeconds ? iat + expirationSeconds : iat + 60 * 60 * 2;

    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const zoomMeetingPayload = {
      appKey: this.zoomSDKKey,
      sdkKey: this.zoomSDKKey,
      mn: meetingNumber.toString(),
      role,
      iat,
      exp,
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(zoomMeetingPayload);
    const signature = KJUR.jws.JWS.sign(
      'HS256',
      sHeader,
      sPayload,
      this.zoomSDKSecret
    );
    return signature;
  }

  async createMeeting(topic: string) {
    const apiUrl = 'users/me/meetings'; // Create by use test user (Me)
    const timezone = 'Asia/Bangkok';
    const payload = {
      topic,
      type: 2,
      start_time: new Date().toISOString(),
      duration: 60,
      timezone,
      settings: {
        host_video: false,
        participant_video: false,
        join_before_host: true,
        mute_upon_entry: true,
        watermark: false,
        approval_type: 2,
        audio: 'both',
        auto_recording: 'none',
        enforce_login: false,
      },
    };

    try {
      const data = await this.zoomServerInstance
        .post(apiUrl, { json: payload })
        .json();
      return data;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
