import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

interface CompCardModel {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  eye_color: string | null;
  hair_color: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  instagram_name: string | null;
  city: string | null;
  state: string | null;
}

interface CompCardPDFProps {
  model: CompCardModel;
  photos: string[]; // base64 data URLs
  logoUrl: string; // base64 data URL
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "Helvetica",
  },
  // Header
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 80,
    height: 32,
    objectFit: "contain",
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  location: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
  },
  // Hero photo
  heroContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  heroPhoto: {
    width: "100%",
    height: 340,
    objectFit: "cover",
    borderRadius: 4,
  },
  // Supporting photos row
  photosRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  supportingPhoto: {
    flex: 1,
    height: 160,
    objectFit: "cover",
    borderRadius: 4,
  },
  // Measurements
  measurementsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 12,
    marginTop: 4,
  },
  measurementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  measurementItem: {
    width: "25%",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  measurementLabel: {
    fontSize: 8,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  measurementValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 9,
    color: "#888888",
  },
  footerBrand: {
    fontSize: 9,
    color: "#ec4899",
    fontFamily: "Helvetica-Bold",
  },
});

export default function CompCardPDF({ model, photos, logoUrl }: CompCardPDFProps) {
  const fullName = [model.first_name, model.last_name].filter(Boolean).join(" ") || "Model";
  const locationParts = [model.city, model.state].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  const heroPhoto = photos[0];
  const supportingPhotos = photos.slice(1, 4);

  // Build measurements array - only include filled fields
  const measurements: { label: string; value: string }[] = [];
  if (model.height) measurements.push({ label: "Height", value: model.height });
  if (model.bust) measurements.push({ label: "Bust", value: model.bust });
  if (model.waist) measurements.push({ label: "Waist", value: model.waist });
  if (model.hips) measurements.push({ label: "Hips", value: model.hips });
  if (model.eye_color) measurements.push({ label: "Eyes", value: model.eye_color });
  if (model.hair_color) measurements.push({ label: "Hair", value: model.hair_color });
  if (model.dress_size) measurements.push({ label: "Dress", value: model.dress_size });
  if (model.shoe_size) measurements.push({ label: "Shoes", value: model.shoe_size });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header: Logo + Name */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <Text style={styles.name}>{fullName}</Text>
          {location && <Text style={styles.location}>{location}</Text>}
        </View>

        {/* Hero Photo */}
        {heroPhoto && (
          <View style={styles.heroContainer}>
            <Image src={heroPhoto} style={styles.heroPhoto} />
          </View>
        )}

        {/* Supporting Photos */}
        {supportingPhotos.length > 0 && (
          <View style={styles.photosRow}>
            {supportingPhotos.map((photo, i) => (
              <Image key={i} src={photo} style={styles.supportingPhoto} />
            ))}
          </View>
        )}

        {/* Measurements */}
        {measurements.length > 0 && (
          <View style={styles.measurementsContainer}>
            <View style={styles.measurementsGrid}>
              {measurements.map((m) => (
                <View key={m.label} style={styles.measurementItem}>
                  <Text style={styles.measurementLabel}>{m.label}</Text>
                  <Text style={styles.measurementValue}>{m.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            {model.instagram_name && (
              <Text style={styles.footerText}>@{model.instagram_name}</Text>
            )}
            {model.username && (
              <Text style={styles.footerText}>examodels.com/{model.username}</Text>
            )}
          </View>
          <Text style={styles.footerBrand}>EXA MODELS</Text>
        </View>
      </Page>
    </Document>
  );
}
