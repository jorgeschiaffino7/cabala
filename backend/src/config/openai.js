import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

export const OPENAI_MODEL = 'gpt-4o-mini';

export default openai;
