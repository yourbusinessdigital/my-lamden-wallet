<script>
	import { Router, Route, Link } from "svelte-routing";
	import Home from "./pages/home.svelte";
	import Login from "./pages/login.svelte";
	import LoginNew from "./pages/login-new.svelte";
	import LoginExisting from "./pages/login-existing.svelte";
	export let url = ""; //This property is necessary declare to avoid ignore the Router

</script>
<Router url="{url}">
	<nav>
	   <Link to="/">Home</Link>
	 </nav>
	 <div>
	   <!--for now the router just support case sensitive,
		   one workaround colud be add two time the route
		   Example.
		  <Route path="About" component="{About}" /> 
	   -->
	   <Route path="/"><Home /></Route>
	 </div>
   </Router><main>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>