module Jekyll
  module RismCatalogueTheme
    class WorkExtractor
      def initialize(work, lang = "en")
        @work = work
        @lang = lang
        @summary = normalized_summary(@work["summary"])
      end

      def index_doc
        doc = {
          "id" => @work["id"],
          "title" => @work.dig("label", "none", 0),
          "textIncipit" => all_values(summary_field("textIncipit", "Text incipit")),
          "scoringSummary" => first_value(summary_field("scoringSummary", "Scoring summary"))
        }

        primary = primary_part
        doc["catalogNumber"] = primary["workNumber"] if primary
        key_mode_value = key_mode
        doc["keyMode"] = key_mode_value.rstrip if key_mode_value
        relationship_values = relationships
        doc["relationships"] = relationship_values if relationship_values && !relationship_values.empty?
        subject_values = subjects
        doc["subject"] = subject_values if subject_values && !subject_values.empty?
        doc["incipit"] = incipit_filename if incipit_svg
        earliest_date = extracted_year(@work.dig("dates", "earliestDate"))
        latest_date = extracted_year(@work.dig("dates", "latestDate"))
        doc["earliestDate"] = earliest_date if earliest_date
        doc["latestDate"] = latest_date if latest_date
        doc
      end

      def key_mode
        first_value(summary_field("keyMode", "Key or mode"), ["en", "none"])
      end

      def incipit_svg
        # first incipit in @work.incipits.items
        incipit_item = @work.dig("incipits", "items")&.first
        # find the .rendered with format "image/svg+xml" and return its data
        svg_rendering = incipit_item&.dig("rendered")&.find { |r| r["format"] == "image/svg+xml" }
        svg_rendering&.dig("data")
      end

      def incipit_filename
        # extract the last part of the @work["id"] after the last slash
        @work["id"][/([^\/]+)$/]
      end

      def relationships
        items = @work.dig("relationships", "items")
        return nil unless items.is_a?(Array)

        values = []
        items.each do |item|
          next unless item.is_a?(Hash)
          values.concat(related_to_values(item["relatedTo"]))
        end

        values = values
          .map { |value| value.to_s.strip }
          .reject(&:empty?)
          .uniq

        values.empty? ? nil : values
      end

      def subjects
        items = @work.dig("formOfWork", "items")
        return nil unless items.is_a?(Array)

        values = items.flat_map { |item| subject_values(item) }
        values = values
          .map { |value| value.to_s.strip }
          .reject(&:empty?)
          .uniq

        values.empty? ? nil : values
      end

      private

      def primary_part
        # find the rism:PrimaryPartOf in @work.partOf.items
        @work.dig("partOf", "items")&.find do |item|
          item["relationshipType"] == "rism:PrimaryPartOf"
        end
      end

      def normalized_summary(summary)
        return {} unless summary

        case summary
        when Hash
          summary
        when Array
          summary.each_with_object({}) do |item, acc|
            key =
              item["name"] ||
              item["id"] ||
              item.dig("label", @lang, 0) ||
              item.dig("label", "none", 0)

            acc[key] = item if key
          end
        else
          {}
        end
      end

      def summary_field(*keys)
        keys.each do |key|
          return @summary[key] if @summary[key]
        end
        nil
      end

      def first_value(field, preferred_langs = ["none", "en"])
        return nil unless field.is_a?(Hash)
        value = field["value"]
        return nil unless value.is_a?(Hash)

        preferred_langs.each do |lang|
          vals = value[lang]
          return vals[0] if vals.is_a?(Array) && vals[0]
        end

        nil
      end

      def all_values(field, preferred_langs = ["none", "en"])
        return nil unless field.is_a?(Hash)
        value = field["value"]
        return nil unless value.is_a?(Hash)

        preferred_langs.each do |lang|
          vals = value[lang]
          return vals if vals.is_a?(Array) && !vals.empty?
        end

        nil
      end

      def extracted_year(value)
        case value
        when Integer
          value
        when Float
          value.to_i
        when String
          match = value.match(/-?\d{1,4}/)
          match ? match[0].to_i : nil
        when Array
          value.each do |entry|
            year = extracted_year(entry)
            return year if year
          end
          nil
        when Hash
          preferred_keys = ["value", "@value", "none", "en", "id", "earliestDate", "latestDate"]
          preferred_keys.each do |key|
            next unless value.key?(key)
            year = extracted_year(value[key])
            return year if year
          end

          value.each_value do |entry|
            year = extracted_year(entry)
            return year if year
          end
          nil
        else
          nil
        end
      end

      def related_to_values(value)
        case value
        when String
          [value]
        when Array
          value.flat_map { |entry| related_to_values(entry) }
        when Hash
          type = value["type"] || value["@type"]
          return [] unless type == "rism:Person"

          label = value.dig("label", @lang, 0) ||
                  value.dig("label", "none", 0) ||
                  value["id"] ||
                  value["name"]
          label ? [label] : []
        else
          []
        end
      end

      def subject_values(value)
        case value
        when String
          [value]
        when Array
          value.flat_map { |entry| subject_values(entry) }
        when Hash
          label = value.dig("label", @lang, 0) ||
                  value.dig("label", "none", 0) ||
                  value["name"] ||
                  value["id"]
          label ? [label] : []
        else
          []
        end
      end

    end
  end
end
