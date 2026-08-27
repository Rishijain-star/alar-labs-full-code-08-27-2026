const db = require('./src/models');

async function fix() {
    try {
        await db.testConnection();
        console.log('Adding columns manually...');
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // 1. CourseMedia: add lesson_id
        try {
            await db.sequelize.query('ALTER TABLE course_media ADD COLUMN lesson_id VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NULL AFTER title');
            console.log('✅ lesson_id added to course_media');
        } catch (e) {
            console.log('lesson_id might already exist in course_media:', e.message);
        }

        // 2. Enrollment: ensure table exists and has correct columns
        try {
            await db.sequelize.query(`
                CREATE TABLE IF NOT EXISTS enrollments (
                    id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL PRIMARY KEY,
                    user_id VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
                    course_id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL,
                    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status ENUM('active', 'completed', 'cancelled', 'expired') DEFAULT 'active',
                    progress INT DEFAULT 0,
                    last_accessed_at DATETIME NULL,
                    expires_at DATETIME NULL,
                    order_id VARCHAR(100) NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    UNIQUE KEY user_course_idx (user_id, course_id),
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log('✅ Enrollments table checked/created');
        } catch (e) {
            console.log('Enrollments table error:', e.message);
        }

        // 3. Courses: Ensure header/footer columns exist
        const courseCols = [
            'header_enabled', 'header_content', 'header_bg_color', 'header_text_color',
            'footer_enabled', 'footer_content', 'footer_bg_color', 'footer_text_color'
        ];
        
        for (const col of courseCols) {
            try {
                let type = col.includes('content') ? 'LONGTEXT' : (col.includes('enabled') ? 'TINYINT(1) DEFAULT 0' : 'VARCHAR(20)');
                await db.sequelize.query(`ALTER TABLE courses ADD COLUMN ${col} ${type} NULL`);
                console.log(`✅ ${col} added to courses`);
            } catch (e) {
                // Ignore if column already exists
            }
        }

        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Done.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fix();
