// Express 앱 설정 및 라우터 등록
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const draftRoutes = require('./routes/drafts');
const homServer = require('./routes/homServer');
const scheduleRoutes = require('./routes/schedule');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', employeeRoutes);
app.use('/api', attendanceRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/AD', homServer);
app.use('/api/schedule', scheduleRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Server running on http://localhost:' + PORT);
});
