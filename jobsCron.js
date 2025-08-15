const cron = require('node-cron');
const { Job } = require('./models'); // adjust path if needed
const { Op } = require('sequelize');

// Runs every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();

    // Update all open jobs whose deadline has passed
    const [updatedCount] = await Job.update(
      { status: 'closed' },
      {
        where: {
          status: 'open',
          deadline: { [Op.lt]: now } // deadline is less than current time
        }
      }
    );

    console.log(`Cron Job: Closed ${updatedCount} expired jobs`);
  } catch (err) {
    console.error('Cron Job Error:', err);
  }
});
