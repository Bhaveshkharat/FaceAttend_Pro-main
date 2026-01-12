import { View, Text, StyleSheet } from "react-native";

type Props = {
  title?: string;
};

export default function AppHeader({ title = "Manager Dashboard" }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100,
    backgroundColor: "#09296dff",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 0
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    paddingBottom: 0
  },
});
