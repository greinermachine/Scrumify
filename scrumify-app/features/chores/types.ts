// Data we expect to receive for each chore from the server (DJANGO)
export type Chore = {
  id: number;
  description: string;
  due_date: string;
  status: "todo" | "in_progress" | "done";
  points: number;
};

// Editing sends the editable fields, while DJANGO keeps the existing ID
export type ChoreForm = Omit<Chore, "id">;
