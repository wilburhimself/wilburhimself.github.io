---
title: Updating redux-form fields using bindActionCreators
date: '2019-03-19T23:46:37.121Z'
---

I have a `redux-form` that contains a dropdown dependent on the selected value of another dropdown.

I have a filter method to slim down the options from the state and fill my dependent dropdown, and it looks great.

I noticed that I had to select a dropdown item from the dependent dropdown to have the value updated in the store.

That's how I found out about `redux-form` [Action Creators](https://redux-form.com/6.0.0-alpha.4/docs/api/actioncreators.md/). They are the internal actions from `redux-form`  to dispatch them as we need.

My interest was to change that field when filtering the dependent dropdown options. `redux-form` provides the `change` method for cases like this.

Setting it up was as simple as:

```javascript
import { bindActionCreators } from 'redux'
import { Field, change } from 'redux-form'

// other imports ...
```

```javascript
const mapDispatchToProps = (dispatch) => ({
  updateField: bindActionCreators((field, data) => {
    change(FORM_NAME, field, data)
  }, dispatch)
})
```

Then using it:

```javascript
this.props.updateField('dependent_field_name', newValue)
```

Something important to note and quoting redux's [documentation](https://redux.js.org/api/bindactioncreators#bindactioncreatorsactioncreators-dispatch) on `bindActionCreators`:

> The only use case for bindActionCreators is when you want to pass some action creators down to a component that isn't aware of Redux, and you don't want to pass dispatch or the Redux store to it.
