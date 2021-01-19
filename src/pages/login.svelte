<script>
    let pageName="Login Page";
</script>

<main>
    <h1> {pageName}!</h1>
    <p>Welcome this is my <b>{pageName}</b></p>
    
    <Link to="/login/new">New Wallet</Link>
    <Link to="/login/existing">Existing Wallet</Link>
    <Route path="/login/new" component="{LoginNewWallet}" /> 
    <Route path="/login/existing" component="{Login-Existing}" /> 
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
