module.exports = (req, res) => {
    res.json({
        message: "Vercel API is working!",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
};
