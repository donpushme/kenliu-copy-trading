import fs from "fs";

export function convertHttpToWebSocket(httpUrl: string): string {
  return httpUrl.replace(/^https?:\/\//, "wss://");
}

export const saveToJSONFile = (filePath: string, data: object): void => {
  // Convert data object to JSON string
  const jsonData = JSON.stringify(data, null, 2); // The `null, 2` argument formats the JSON with indentation
  fs.writeFileSync(filePath, jsonData, "utf8");
  console.log("Data saved to JSON file.");
};

export const saveSettings = (field: string, value: any) => {
  const fileData = fs.readFileSync("./bot/settings.json", "utf8");
  const settings = JSON.parse(fileData);

  settings[field] = value;
  saveToJSONFile("./bot/settings.json", settings);
};
