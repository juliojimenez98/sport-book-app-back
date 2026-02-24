import cron from "node-cron";
import { Op } from "sequelize";
import Booking from "../models/Booking";
import Branch from "../models/Branch";
import Resource from "../models/Resource";
import AppUser from "../models/AppUser";
import Guest from "../models/Guest";
import { sendPostBookingSurvey, CompleteBooking } from "../services/email.service";

/**
 * Initializes cron jobs.
 */
export function initJobs() {
  // Run every 15 minutes to check for finished bookings
  cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("⏰ Running post-booking survey cron job...");
      
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      // We also define a lower bound so we don't accidentally send surveys for very old bookings
      // that were added to the system or just had the 'surveySent' flag added.
      // E.g. anything that finished between 24 hours ago and 1 hour ago.
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const bookings = await Booking.findAll({
        where: {
          status: "confirmed",
          surveySent: false,
          endAt: {
            [Op.lt]: oneHourAgo,
            [Op.gt]: twentyFourHoursAgo,
          },
        },
        include: [
          { model: Branch, as: "branch", attributes: ["name", "tenantId", "branchId"] },
          { model: Resource, as: "resource", attributes: ["name"] },
          { model: AppUser, as: "user", attributes: ["email", "firstName", "lastName"] },
          { model: Guest, as: "guest", attributes: ["email", "firstName", "lastName"] },
        ],
      });

      if (bookings.length === 0) {
        console.log("ℹ️ No pending surveys to send.");
        return;
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      let sentCount = 0;
      for (const booking of bookings) {
        // We ensure we typecast or extract data as expected by CompleteBooking
        const bookingData = booking.toJSON() as CompleteBooking;
        
        const surveyUrl = `${frontendUrl}/survey/${booking.bookingId}`;
        
        try {
          // Send email
          await sendPostBookingSurvey(bookingData, surveyUrl);
          
          // Mark as sent
          await booking.update({ surveySent: true });
          sentCount++;
        } catch (err) {
          console.error(`Error sending survey for booking ${booking.bookingId}:`, err);
        }
      }

      console.log(`✅ Sent ${sentCount} post-booking surveys.`);
    } catch (error) {
      console.error("❌ Error in post-booking survey cron job:", error);
    }
  });

  console.log("🚀 Cron jobs initialized.");
}
