const https = require('https');
const fs = require('fs');
const path = require('path');

const COMPONENT_FILES = {
  'LM358': {
    file: 'Ti-LM358-HD.jpg',
    description: 'Texas Instruments LM358P Dual Operational Amplifier in DIP-8 package with authentic TI markings'
  },
  'NE555': {
    file: 'NE555 DIP & SOIC.jpg',
    description: 'NE555 Precision Timer IC in 8-pin Dual In-line Package (DIP-8)'
  },
  'LM7805': {
    file: 'LM7805C 5 Volt Regulator.jpg',
    description: 'LM7805C Positive 5V Voltage Regulator in TO-220 package with metal mounting tab'
  },
  '1N4007': {
    file: 'Diode 1N4007.jpg',
    description: '1N4007 1000V 1A Standard Silicon Rectifier Diode in DO-41 axial package with silver cathode band'
  },
  '1N4148': {
    file: 'Diode 1n4148.jpg',
    description: '1N4148 High-Speed Switching Diode in DO-35 hermetic glass envelope'
  },
  'BC547': {
    file: 'BC547_Transistor_-_01.jpg',
    description: 'BC547B NPN General Purpose Bipolar Junction Transistor in TO-92 plastic package'
  },
  'MFR-25FTE52-10K': {
    file: 'Resistor 10k lanidx.jpg',
    altFile: '10K Resistor 1480820.jpg',
    description: '10 kΩ Metal Film / Carbon Film Axial Leaded Resistor'
  },
  'C315C104K5R5TA': {
    file: '100 nF Capacitor.jpg',
    description: '100 nF (0.1 µF) 50V Radial Leaded Ceramic Disc / MLCC Capacitor'
  },
  'RLB0914-101KL': {
    file: '10mH Murata through-hole mini choke 01.jpg',
    description: 'Radial Leaded Through-Hole Mini Power Choke Inductor'
  },
  'B3F-1000': {
    file: 'Tactile switches.jpg',
    description: '6x6 mm SPST-NO Through-Hole PCB Tactile Push-Button Switch'
  },
  '0022232041': {
    file: '4 Pin Header.jpg',
    description: '4-Circuit Vertical Solid Pin Friction Lock Header, 2.54 mm pitch'
  }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'CirqonApp/1.0 (contact@cirqon-electronics.org)'
    };
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const headers = {
      'User-Agent': 'CirqonApp/1.0 (contact@cirqon-electronics.org)'
    };
    https.get(url, { headers }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`Status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function getImageUrl(fileName) {
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
  const res = await fetchJson(apiUrl);
  const pages = res.query.pages;
  const pageId = Object.keys(pages)[0];
  if (pageId === '-1') throw new Error(`File not found on Commons: ${fileName}`);
  const info = pages[pageId].imageinfo[0];
  return info.thumburl || info.url;
}

async function run() {
  const targetDir = path.join(__dirname, '..', 'client', 'public', 'images', 'components');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const manifest = {};

  for (const [mpn, item] of Object.entries(COMPONENT_FILES)) {
    const dest = path.join(targetDir, `${mpn}.jpg`);
    console.log(`Processing ${mpn} (${item.file})...`);
    try {
      let downloadUrl;
      try {
        downloadUrl = await getImageUrl(item.file);
      } catch (err) {
        if (item.altFile) {
          console.log(`  Trying alternative: ${item.altFile}...`);
          downloadUrl = await getImageUrl(item.altFile);
        } else {
          throw err;
        }
      }
      await download(downloadUrl, dest);
      const size = fs.statSync(dest).size;
      console.log(`  [OK] Saved ${mpn}.jpg (${size} bytes)`);
      manifest[mpn] = {
        mpn,
        localPath: `/images/components/${mpn}.jpg`,
        sourceFile: item.file,
        description: item.description,
        sizeBytes: size,
        status: 'verified-photograph'
      };
    } catch (err) {
      console.error(`  [FAILED] ${mpn}:`, err.message);
      manifest[mpn] = {
        mpn,
        status: 'download-failed',
        error: err.message
      };
    }
  }

  const manifestPath = path.join(targetDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Manifest written to', manifestPath);
}

run();

