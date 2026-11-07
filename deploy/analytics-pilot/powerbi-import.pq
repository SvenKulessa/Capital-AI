// Create a Text parameter named ReportCsvPath pointing to synthetic-tenant-a.csv.
// Local synthetic demonstration only; Power BI Desktop execution is NOT_PROVEN.
let
    Source = Csv.Document(File.Contents(ReportCsvPath), [Delimiter=",", Columns=3, Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Types = Table.TransformColumnTypes(Headers, {{"category", type text}, {"event_count", Int64.Type}, {"duration_ms", Int64.Type}})
in
    Types
