const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.API_SECRET) {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }
};

module.exports = verifyApiKey;
