export interface LogEntry {
	level: string;
	projectId: string;
	message?: string;
	msg?: string;
	timestamp?: string;
}

export interface LoggerData {
	logs: LogEntry[];
}
