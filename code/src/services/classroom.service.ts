import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { ClassroomAnnouncement } from "../types";

const classroom = google.classroom("v1");

export class ClassroomService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
  }

  async fetchClassroomAnnouncements(
    refreshToken: string
  ): Promise<ClassroomAnnouncement[]> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // Get list of courses
      const coursesResponse = await classroom.courses.list({
        auth: this.oauth2Client,
        pageSize: 10,
      });

      const courses = coursesResponse.data.courses || [];
      const announcements: ClassroomAnnouncement[] = [];

      for (const course of courses) {
        if (!course.id) continue;

        const announcementsResponse = await classroom.courses.announcements.list(
          {
            auth: this.oauth2Client,
            courseId: course.id,
            pageSize: 20,
            orderBy: "updateTime desc",
          }
        );

        const courseAnnouncements =
          announcementsResponse.data.announcements || [];

        for (const announcement of courseAnnouncements) {
          announcements.push({
            id: announcement.id || "",
            courseId: course.id,
            courseName: course.name || "",
            text: announcement.text || "",
            createdTime: new Date(announcement.creationTime || ""),
            materials: announcement.materials || [],
          });
        }
      }

      return announcements;
    } catch (error) {
      console.error("Error fetching Classroom announcements:", error);
      throw error;
    }
  }
}
