import { useCallback, useMemo } from "react";
import {
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LogCategory, LogEntry, LogLevel } from "@/hooks/useLogStore";
import { useLogStore } from "@/hooks/useLogStore";

const LEVEL_COLOR: Record<LogLevel, string> = {
	debug: "#60a5fa",
	info: "#34d399",
	warn: "#fbbf24",
	error: "#f87171",
};

const LEVEL_BG: Record<LogLevel, string> = {
	debug: "#0f2744",
	info: "#022c22",
	warn: "#2d1200",
	error: "#2d0a0a",
};

const LEVELS: Array<LogLevel | "all"> = ["all", "debug", "info", "warn", "error"];
const CATEGORIES: Array<LogCategory | "all"> = [
	"all",
	"network",
	"db",
	"auth",
	"audio",
	"sync",
	"ui",
	"general",
];

function LogRow({ item }: { item: LogEntry }) {
	const time = item.timestamp.toTimeString().slice(0, 8);
	return (
		<View style={[styles.row, { backgroundColor: LEVEL_BG[item.level] }]}>
			<View style={styles.rowHeader}>
				<View
					style={[styles.badge, { backgroundColor: LEVEL_COLOR[item.level] }]}
				>
					<Text style={styles.badgeText}>{item.level[0].toUpperCase()}</Text>
				</View>
				<Text style={styles.time}>{time}</Text>
				<Text style={styles.category}>[{item.category}]</Text>
			</View>
			<Text style={styles.message}>{item.message}</Text>
			{item.data !== undefined && (
				<Text style={styles.data} numberOfLines={5}>
					{JSON.stringify(item.data, null, 2)}
				</Text>
			)}
		</View>
	);
}

export function DevPanel() {
	const {
		logs,
		filterLevel,
		filterCategory,
		search,
		isVisible,
		setFilterLevel,
		setFilterCategory,
		setSearch,
		toggleVisible,
		clearLogs,
	} = useLogStore();

	const filtered = useMemo(
		() =>
			logs.filter((log) => {
				if (filterLevel !== "all" && log.level !== filterLevel) return false;
				if (filterCategory !== "all" && log.category !== filterCategory)
					return false;
				if (search && !log.message.toLowerCase().includes(search.toLowerCase()))
					return false;
				return true;
			}),
		[logs, filterLevel, filterCategory, search],
	);

	const insets = useSafeAreaInsets();
	const renderItem = useCallback(
		({ item }: { item: LogEntry }) => <LogRow item={item} />,
		[],
	);

	if (!__DEV__) return null;

	return (
		<>
			<TouchableOpacity
				style={[styles.fab, { bottom: insets.bottom + 80 }]}
				onPress={toggleVisible}
			>
				<Text style={styles.fabText}>🐛 {logs.length}</Text>
			</TouchableOpacity>

			<Modal
				visible={isVisible}
				animationType="slide"
				onRequestClose={toggleVisible}
			>
				<View style={[styles.modal, { paddingTop: insets.top }]}>
					<View style={styles.header}>
						<Text style={styles.title}>
							Logs{" "}
							<Text style={styles.count}>
								({filtered.length}/{logs.length})
							</Text>
						</Text>
						<View style={styles.headerActions}>
							<TouchableOpacity onPress={clearLogs} style={styles.clearBtn}>
								<Text style={styles.clearBtnText}>Clear</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={toggleVisible} style={styles.closeBtn}>
								<Text style={styles.closeBtnText}>✕</Text>
							</TouchableOpacity>
						</View>
					</View>

					<TextInput
						style={styles.searchInput}
						placeholder="Search messages..."
						placeholderTextColor="#475569"
						value={search}
						onChangeText={setSearch}
						autoCapitalize="none"
						autoCorrect={false}
					/>

					<View style={styles.filterRow}>
						{LEVELS.map((level) => (
							<Pressable
								key={level}
								style={[
									styles.chip,
									filterLevel === level && {
										backgroundColor:
											level === "all"
												? "#334155"
												: LEVEL_COLOR[level as LogLevel],
										borderColor:
											level === "all"
												? "#334155"
												: LEVEL_COLOR[level as LogLevel],
									},
								]}
								onPress={() => setFilterLevel(level)}
							>
								<Text
									style={[
										styles.chipText,
										filterLevel === level && styles.chipTextActive,
									]}
								>
									{level}
								</Text>
							</Pressable>
						))}
					</View>

					<View style={styles.filterRow}>
						{CATEGORIES.map((cat) => (
							<Pressable
								key={cat}
								style={[
									styles.chip,
									filterCategory === cat && styles.chipActive,
								]}
								onPress={() => setFilterCategory(cat)}
							>
								<Text
									style={[
										styles.chipText,
										filterCategory === cat && styles.chipTextActive,
									]}
								>
									{cat}
								</Text>
							</Pressable>
						))}
					</View>

					<FlatList
						data={filtered}
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
						style={styles.list}
						contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
					/>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	fab: {
		position: "absolute",
		right: 16,
		backgroundColor: "#1e293b",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#334155",
		zIndex: 9999,
	},
	fabText: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
	modal: { flex: 1, backgroundColor: "#0f172a" },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#1e293b",
	},
	title: { color: "#e2e8f0", fontSize: 18, fontWeight: "700" },
	count: { color: "#64748b", fontWeight: "400", fontSize: 15 },
	headerActions: { flexDirection: "row", gap: 8 },
	clearBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: "#7f1d1d",
		borderRadius: 6,
	},
	clearBtnText: { color: "#fca5a5", fontSize: 13, fontWeight: "600" },
	closeBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: "#1e293b",
		borderRadius: 6,
	},
	closeBtnText: { color: "#94a3b8", fontSize: 15 },
	searchInput: {
		marginHorizontal: 12,
		marginTop: 10,
		backgroundColor: "#1e293b",
		color: "#e2e8f0",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 14,
		borderWidth: 1,
		borderColor: "#334155",
	},
	filterRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		paddingHorizontal: 12,
		gap: 6,
		marginTop: 8,
	},
	chip: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		backgroundColor: "#1e293b",
		borderWidth: 1,
		borderColor: "#334155",
	},
	chipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
	chipText: { color: "#64748b", fontSize: 12, fontWeight: "500" },
	chipTextActive: { color: "#fff" },
	list: { flex: 1, marginTop: 8 },
	separator: { height: 4 },
	row: { padding: 10, marginHorizontal: 8, borderRadius: 8 },
	rowHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: 4,
	},
	badge: {
		width: 18,
		height: 18,
		borderRadius: 3,
		alignItems: "center",
		justifyContent: "center",
	},
	badgeText: { color: "#000", fontSize: 10, fontWeight: "800" },
	time: { color: "#475569", fontSize: 11, fontFamily: "monospace" },
	category: { color: "#64748b", fontSize: 11 },
	message: { color: "#e2e8f0", fontSize: 13, lineHeight: 18 },
	data: {
		color: "#64748b",
		fontSize: 11,
		fontFamily: "monospace",
		marginTop: 4,
		lineHeight: 16,
	},
});
