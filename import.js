const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const newPgPool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_TKH2vGo9YUqg@ep-tiny-dust-antvq8qu-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false }
});

async function importData() {
    try {
        console.log("Reading backup file...");
        // the user is in c:\Users\Mina\Downloads\la-haram-main so old_data_backup.json is there
        const backupPath = path.join(process.cwd(), 'old_data_backup.json');
        
        if (!fs.existsSync(backupPath)) {
            console.error("Backup file not found at " + backupPath);
            return;
        }

        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`Found ${data.length} records. Wait, connecting to New Database...`);
        
        // Wait to connect to the new DB properly
        await newPgPool.connect();

        // Create table just in case it's completely fresh
        await newPgPool.query(`
            CREATE TABLE IF NOT EXISTS participants (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                contact TEXT NOT NULL,
                image TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        let count = 0;
        for (const user of data) {
            // Use old created_at if possible, otherwise use new
            const createdAt = user.created_at || user.createdAt || new Date();
            
            await newPgPool.query(
                'INSERT INTO participants (name, contact, image, created_at) VALUES ($1, $2, $3, $4)',
                [user.name, user.contact, user.image, createdAt]
            );
            count++;
            process.stdout.write(`\rUploaded ${count} of ${data.length} to New DB`);
        }
        
        console.log("\n✅ All old data has been permanently saved to the NEW database!");
    } catch (err) {
        console.error("\nError during import:", err);
    } finally {
        await newPgPool.end();
    }
}

importData();
