#!/usr/bin/env python3
"""Extract graph data from the epigraph.db clean table and export as JSON."""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "db", "epigraph.db")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "frontend", "graphData.json")

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Fetch all rows from clean table
    cur.execute("""
        SELECT 
            eid,
            epigraph,
            eauthor,
            etitle,
            emedium,
            ecountry,
            eyear,
            wtitle,
            wauthor,
            wnationality,
            wyear,
            wgenre,
            wisbn
        FROM clean
        WHERE etitle IS NOT NULL AND wtitle IS NOT NULL
          AND etitle != 'NULL' AND wtitle != 'NULL'
          AND eauthor IS NOT NULL AND eauthor != 'NULL'
          AND wauthor IS NOT NULL AND wauthor != 'NULL'
    """)

    rows = cur.fetchall()

    nodes = {}  # key: "title|||author" -> node dict
    edges = []
    edge_set = set()  # to deduplicate edges

    for row in rows:
        # Source node (epigraph source work)
        e_key = f"{row['etitle']}|||{row['eauthor'] or 'Unknown'}"
        if e_key not in nodes:
            nodes[e_key] = {
                "id": e_key,
                "title": row["etitle"],
                "author": row["eauthor"] or "Unknown",
                "medium": row["emedium"],
                "country": row["ecountry"],
                "year": row["eyear"],
                "genre": None,
                "isbn": None,
                "type": "source",  # this work is referenced as an epigraph source
            }

        # Target node (work that contains the epigraph)
        w_key = f"{row['wtitle']}|||{row['wauthor'] or 'Unknown'}"
        if w_key not in nodes:
            nodes[w_key] = {
                "id": w_key,
                "title": row["wtitle"],
                "author": row["wauthor"] or "Unknown",
                "medium": None,
                "country": row["wnationality"],
                "year": row["wyear"],
                "genre": row["wgenre"],
                "isbn": row["wisbn"],
                "type": "work",  # this work contains an epigraph
            }
        else:
            # Update with richer info if available
            n = nodes[w_key]
            if not n["genre"] and row["wgenre"]:
                n["genre"] = row["wgenre"]
            if not n["year"] and row["wyear"]:
                n["year"] = row["wyear"]
            if not n["country"] and row["wnationality"]:
                n["country"] = row["wnationality"]

        # Edge: source -> target (epigraph source referenced BY work)
        edge_key = f"{e_key}|||{w_key}"
        if edge_key not in edge_set:
            edge_set.add(edge_key)
            epigraph_text = row["epigraph"] or ""
            # Truncate long epigraphs for display
            if len(epigraph_text) > 300:
                epigraph_text = epigraph_text[:300] + "..."
            edges.append({
                "source": e_key,
                "target": w_key,
                "epigraph": epigraph_text,
                "emedium": row["emedium"],
            })

    # Convert nodes dict to list
    node_list = list(nodes.values())

    # Compute degree for each node (number of connections)
    degree = {}
    for edge in edges:
        degree[edge["source"]] = degree.get(edge["source"], 0) + 1
        degree[edge["target"]] = degree.get(edge["target"], 0) + 1

    for node in node_list:
        node["degree"] = degree.get(node["id"], 0)

    graph_data = {
        "nodes": node_list,
        "links": edges,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, ensure_ascii=False)

    print(f"Exported {len(node_list)} nodes and {len(edges)} edges to {OUTPUT_PATH}")
    
    # Print some stats
    degrees = sorted(degree.values(), reverse=True)
    print(f"Max degree: {degrees[0]}, Median degree: {degrees[len(degrees)//2]}")
    print(f"Top 10 most connected nodes:")
    top_nodes = sorted(nodes.values(), key=lambda n: n["degree"], reverse=True)[:10]
    for n in top_nodes:
        print(f"  {n['title']} by {n['author']} — degree {n['degree']}")

    conn.close()

if __name__ == "__main__":
    main()
