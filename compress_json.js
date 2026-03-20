const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function compressData() {
    try {
        console.log("Reading old backup...");
        const backupPath = path.join(__dirname, '../old_data_backup.json');
        
        if (!fs.existsSync(backupPath)) {
            console.error("Backup file not found!");
            return;
        }

        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`Found ${data.length} records. Compressing images to save space...`);

        const compressedData = [];
        let count = 0;

        for (const user of data) {
            let optimizedImage = user.image;

            if (user.image && user.image.startsWith('data:image')) {
                // Extract base64
                const base64Data = user.image.split(';base64,').pop();
                const imgBuffer = Buffer.from(base64Data, 'base64');
                
                // Compress very tightly for frontend static JSON
                try {
                    const compressedBuffer = await sharp(imgBuffer)
                        .resize({ width: 200, withoutEnlargement: true }) // Very small thumbnail
                        .jpeg({ quality: 40 }) // High compression
                        .toBuffer();
                        
                    optimizedImage = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
                } catch (e) {
                    console.log(`Failed to compress image for user ${user.name}`);
                }
            }

            compressedData.push({
                name: user.name,
                contact: user.contact,
                image: optimizedImage,
                createdAt: user.created_at || user.createdAt
            });

            count++;
            process.stdout.write(`\rCompressed ${count} of ${data.length}`);
        }

        // Save to Frontend folder!
        const frontendPath = path.join(__dirname, '../fuzzy-goggles-main/fuzzy-goggles-main/old_data.json');
        fs.writeFileSync(frontendPath, JSON.stringify(compressedData));
        console.log('\n✅ Data successfully compressed and saved to frontend: ' + frontendPath);
    } catch (err) {
        console.error('\nError:', err);
    }
}

compressData();
