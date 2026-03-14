# Fineco AWS + Vercel Deployment Guide

This project uses Angular on Vercel and Java backend on AWS.

## 1) Backend (AWS)

Use either:
- Elastic Beanstalk (fastest for hackathon delivery), or
- EC2 + systemd + Nginx

Recommended production setup:
- Java API behind Application Load Balancer (ALB)
- TLS certificate managed by AWS Certificate Manager (ACM)
- PostgreSQL on AWS RDS

## 2) Required Backend Env Vars

Set these in AWS backend runtime:
- `SPRING_DATASOURCE_URL=jdbc:postgresql://<rds-endpoint>:5432/<db_name>`
- `SPRING_DATASOURCE_USERNAME=<db_user>`
- `SPRING_DATASOURCE_PASSWORD=<db_password>`
- `JWT_SECRET=<long-random-secret>`
- `CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>`

If you have multiple frontends, use a comma-separated list in CORS config.

## 3) Frontend Runtime Config (Vercel)

This Angular app reads runtime config from `public/runtime-config.js`.

Edit `public/runtime-config.js` before deployment:

```js
window.__FINECO_CONFIG__ = {
  apiBaseUrl: 'https://<your-aws-api-domain>/api',
  enforceHttps: true,
};
```

Do not hardcode API URLs in source anymore.

## 4) CORS Checklist

Ensure backend allows:
- Origin: `https://<your-vercel-domain>`
- Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Headers: `Content-Type, Authorization, X-CSRF-Token`
- Credentials only if needed

Also confirm preflight (`OPTIONS`) returns `200/204`, not `403`.

## 5) HTTPS Checklist

- ACM certificate attached to ALB
- Redirect HTTP -> HTTPS at ALB/Nginx
- Frontend runtime config points to `https://...`

## 6) Database Setup

Run schema from:
- `docs/aws-rds-schema.sql`

## 7) Smoke Tests

From local shell:

```bash
curl -I https://<your-aws-api-domain>/api
curl -i -X OPTIONS "https://<your-aws-api-domain>/api/auth/login" \
  -H "Origin: https://<your-vercel-domain>" \
  -H "Access-Control-Request-Method: POST"
```

Expected:
- API responds (non-network failure)
- OPTIONS preflight is allowed
