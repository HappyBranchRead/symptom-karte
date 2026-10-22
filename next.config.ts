import type {NextConfig} from 'next';
const config: NextConfig = {
 async headers() {return [{source: '/(.*)', headers: [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'same-origin'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') + "; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}
 ]}];}
};
export default config;
