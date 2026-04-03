import PocketBase from "pocketbase";
import { pbURL } from '../constants'

console.log("connecting to: " + pbURL)
const pb = new PocketBase(pbURL);
export default pb;


