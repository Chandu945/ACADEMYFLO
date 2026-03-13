export type GalleryPhoto = {
  id: string;
  eventId: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
};
