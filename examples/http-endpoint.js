import { createServer } from 'node:http';
import { URL } from 'node:url';

import { createDecoder } from '@cardog/corgi';

const PORT = Number(process.env.PORT ?? 3000);

console.log(`Starting VIN decoder server on port ${PORT}...`);
const decoder = await createDecoder();

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Request URL is required' }));
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host ?? `localhost:${PORT}`}`);

  if (req.method !== 'GET' || requestUrl.pathname !== '/decode') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  const vin = requestUrl.searchParams.get('vin');

  if (!vin) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing vin query parameter' }));
    return;
  }

  try {
    const result = await decoder.decode(vin);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        {
          vin: result.vin,
          valid: result.valid,
          vehicle: result.components.vehicle,
          engine: result.components.engine,
          plant: result.components.plant,
          errors: result.errors,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error('Failed to decode VIN', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to decode VIN' }));
  }
});

server.listen(PORT, () => {
  console.log(`VIN decoder server ready at http://localhost:${PORT}/decode?vin=YOURVIN`);
});

async function shutdown() {
  console.log('Shutting down server...');
  await new Promise(resolve => server.close(resolve));
  await decoder.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
