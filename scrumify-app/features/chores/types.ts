// Data we expect to receive for each chore from the server (DJANGO)
export type Chore = {
  id: number;
  description: string;
  due_date: string;
  due_time?: string;
  status: "todo" | "in_progress" | "done";
  points: number;
};

// Editing sends the editable fields, while DJANGO keeps the existing ID
export type ChoreForm = Omit<Chore, "id">;

// The user's routine freeze, both dates use YYYY-MM-DD and include the end date
export type Freeze = {
  start_date: string;
  end_date: string;
  days: number; // How many days due dates were pushed back
  shifted_count: number; // How many chores were pushed back
};
