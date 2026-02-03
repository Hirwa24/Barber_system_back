const Manager = require('../models/Manager');

module.exports = async function(req, res, next) {
    try {
        const manager = await Manager.findById(req.managerId);
        if (!manager || manager.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }
        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error checking admin role' });
    }
};
