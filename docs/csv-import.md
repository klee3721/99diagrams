# CSV import

99draw can create an editable diagram from a small CSV table. This is useful
for turning spreadsheet rows, issue lists or lightweight process inventories
into a flowchart without writing the internal `.99draw.json` format by hand.

Open the command palette and run `Import CSV diagram`, then paste a CSV table
with a header row.

```csv
id,label,kind,next,x,y
start,Start,start,review,120,80
review,Review request,decision,ship;revise,340,80
ship,Ship it,process,,580,40
revise,Revise,document,,580,170
```

Required columns:

* `id`: unique shape id in the imported diagram.
* `label`: text shown inside the shape.

Optional columns:

* `kind`, `type` or `shape`: one of `start`, `process`, `decision`, `input`,
  `document`, `database`, `note`, `group`, `swimlane` or `image`. Unknown values
  fall back to `process`.
* `next`, `to`, `target` or `targets`: target ids connected from this row. Use
  `;` or `|` to list multiple targets.
* `x` and `y`: canvas coordinates. If omitted, 99draw places shapes on a simple
  grid.

The importer supports quoted cells, including labels with commas. Duplicate ids
or missing required headers are rejected. Targets that do not exist are ignored,
so a partially prepared spreadsheet can still import the valid part.
