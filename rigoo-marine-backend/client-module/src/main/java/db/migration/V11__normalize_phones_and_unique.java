package db.migration;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Phone-as-primary-identifier shift:
 *   1. Normalize every existing clients.phone to E.164 (default region QA).
 *   2. Detect duplicates after normalization. If found, abort with the offending phones
 *      so the operator can resolve them manually before retrying.
 *   3. Add UNIQUE constraint + index on clients.phone.
 *
 * Best-effort: rows with un-parseable phones are left unchanged and logged.
 * They'll only block the migration if they collide with another row's phone.
 *
 * <p>Versioned V11 (was V4): the V4 slot collided with V4__email_outbox.sql.
 * This migration only touches clients.phone and has no FK dependents, so
 * running it last is order-equivalent to running it at V4.
 */
public class V11__normalize_phones_and_unique extends BaseJavaMigration {

    private static final Logger log = Logger.getLogger(V11__normalize_phones_and_unique.class.getName());
    private static final String DEFAULT_REGION = "QA";

    @Override
    public void migrate(Context context) throws Exception {
        Connection conn = context.getConnection();
        PhoneNumberUtil util = PhoneNumberUtil.getInstance();

        // 1. Read every (id, phone)
        List<long[]> idHolder = new ArrayList<>();
        Map<Long, String> idToPhone = new HashMap<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT id, phone FROM clients")) {
            while (rs.next()) {
                long id = rs.getLong(1);
                String phone = rs.getString(2);
                idToPhone.put(id, phone);
                idHolder.add(new long[]{id});
            }
        }

        // 2. Normalize each, build the desired final value per id
        Map<Long, String> normalized = new HashMap<>();
        for (Map.Entry<Long, String> e : idToPhone.entrySet()) {
            String raw = e.getValue();
            if (raw == null || raw.isBlank()) {
                log.warning("Client id=" + e.getKey() + " has empty phone — leaving as-is");
                continue;
            }
            try {
                Phonenumber.PhoneNumber parsed = util.parse(raw.trim(), DEFAULT_REGION);
                if (!util.isValidNumber(parsed)) {
                    log.warning("Client id=" + e.getKey() + " phone '" + raw + "' is not a valid number — leaving as-is");
                    normalized.put(e.getKey(), raw);
                    continue;
                }
                String e164 = util.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
                normalized.put(e.getKey(), e164);
            } catch (NumberParseException ex) {
                log.warning("Client id=" + e.getKey() + " phone '" + raw + "' could not be parsed — leaving as-is");
                normalized.put(e.getKey(), raw);
            }
        }

        // 3. Detect duplicates among the final values
        Map<String, List<Long>> phoneToIds = new HashMap<>();
        for (Map.Entry<Long, String> e : normalized.entrySet()) {
            phoneToIds.computeIfAbsent(e.getValue(), k -> new ArrayList<>()).add(e.getKey());
        }
        List<String> duplicates = phoneToIds.entrySet().stream()
                .filter(entry -> entry.getValue().size() > 1)
                .map(entry -> entry.getKey() + " → ids " + entry.getValue())
                .toList();
        if (!duplicates.isEmpty()) {
            String message = "Cannot add UNIQUE on clients.phone — duplicate phones detected:\n  "
                    + String.join("\n  ", duplicates)
                    + "\nResolve the duplicates manually (DELETE one, or edit the phone), then re-run.";
            throw new IllegalStateException(message);
        }

        // 4. Apply normalization writes only where the value actually changed
        try (PreparedStatement ps = conn.prepareStatement("UPDATE clients SET phone = ? WHERE id = ?")) {
            int updated = 0;
            for (Map.Entry<Long, String> e : normalized.entrySet()) {
                String original = idToPhone.get(e.getKey());
                String target = e.getValue();
                if (target != null && !target.equals(original)) {
                    ps.setString(1, target);
                    ps.setLong(2, e.getKey());
                    ps.addBatch();
                    updated++;
                }
            }
            if (updated > 0) {
                ps.executeBatch();
                log.info("Normalized " + updated + " phones to E.164");
            }
        }

        // 5. Add UNIQUE + index. Use IF NOT EXISTS to be idempotent on retry.
        try (Statement st = conn.createStatement()) {
            st.execute("ALTER TABLE clients ADD CONSTRAINT clients_phone_key UNIQUE (phone)");
            st.execute("CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)");
        } catch (SQLException ex) {
            // If the constraint already exists (rare; manual prior add), don't fail the migration.
            if (ex.getMessage() == null || !ex.getMessage().toLowerCase().contains("already exists")) {
                throw ex;
            }
            log.info("UNIQUE constraint on clients.phone already present — skipping");
        }
    }
}
