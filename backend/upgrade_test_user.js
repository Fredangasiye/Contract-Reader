const { getUserByEmail, updateUser } = require('./src/services/dataStorage');

async function upgradeUser(email) {
    try {
        const user = await getUserByEmail(email);
        if (!user) {
            console.error('User not found');
            return;
        }
        await updateUser(user.userId, { subscriptionTier: 'premium' });
        console.log(`User ${email} upgraded to premium`);
    } catch (error) {
        console.error('Failed to upgrade user:', error);
    }
}

upgradeUser('test-redflags@example.com');
