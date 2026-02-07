# epigraphs-db

A mapping of epigraphs from the literary world.

## Running

To run this program locally, you will need to:

1. Run `python extract_graph.py`. This will generate a `graphData.json` file in the frontend.
2. Run `npm i` and then `npm run start` in the frontend directory. This will generate the `bundle.js` and thats the script file referenced in the `index.html` file.
3. You can then simply view the HTML file in your browser or if you want it hosted, you can do `python -m http.server 8080` inside the frontend directory to have the frontend hosted at port 8080.  

## References

This work is only a UI for the database provided by the Epigraphs project of the Computation Linguistics Lab. You can see the project [here](https://bond-lab.github.io/epigraphs/).
