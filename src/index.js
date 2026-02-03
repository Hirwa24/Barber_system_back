const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const barberRoutes = require('./routes/barbers');
const txRoutes = require('./routes/transactions');
const loanRoutes = require('./routes/loans');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60 * 1000, max: 500 }));

app.get('/', (req, res) => res.send('Salon Manager Rwanda API'));

app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/transactions', txRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
	app.listen(PORT, () => console.log(`API iri kuri port ${PORT}`));
}).catch((e) => {
	console.error('DB connection failed', e);
	process.exit(1);
});
