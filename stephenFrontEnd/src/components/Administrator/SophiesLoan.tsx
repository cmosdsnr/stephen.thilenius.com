/**
 * @fileoverview Sophie's Loan management component for tracking loan payments and balances.
 * Provides an interactive table interface for managing loan transactions including payments,
 * extra payments, interest calculations, and balance tracking with real-time updates.
 */

import React, { useState, useEffect } from 'react'
import { useData } from '../../contexts/DataContext'
import AdminPageLayout from './AdminPageLayout'
import "../../css/miscellaneous.css"
import deleted from "../../images/deleted.png"
import addTo from "../../images/add.png"

/** US Dollar currency formatter for consistent monetary display */
let dollarUS = Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

interface CurrencyProps {
    value: number;
}

/**
 * Currency display component for formatting dollar amounts.
 * Uses Intl.NumberFormat for consistent US dollar formatting.
 *
 * @component
 * @param {Object} props - Component props
 * @param {number} props.value - The monetary value to format and display
 * @returns {JSX.Element} Formatted currency display
 *
 * @example
 * ```jsx
 * <Currency value={1234.56} />
 * // Renders: $1,234.56
 *
 * <Currency value={-500} />
 * // Renders: -$500.00
 * ```
 */
const Currency = ({ value }: CurrencyProps) => {
    return (
        <span>{dollarUS.format(value)}</span>
        // import CurrencyFormat from 'react-currency-format'
        // <CurrencyFormat value={value} displayType={'text'} thousandSeparator={true} prefix={'$'} decimalScale={2} />
    )
}

interface LoanTransaction {
    id: string;
    date: Date;
    payment: number;
    extra: number;
    interest: number;
    withdraw: number;
    balance: number;
    confirmed: boolean;
    active?: boolean;
}

interface TransactionRowProps {
    transaction: LoanTransaction;
    index: number;
    update: (index: number, transaction: LoanTransaction) => void;
    remove: (id: string) => void;
    active: number;
    setActive: (index: number) => void;
}

/**
 * Sophie's Loan management component for tracking and managing loan transactions.
 * Provides a comprehensive interface for loan payment tracking with interest calculations,
 * balance management, and transaction history with editable rows for unconfirmed entries.
 *
 * @component
 * @returns {JSX.Element} Complete loan management interface
 *
 * @example
 * ```jsx
 * // Usage in routing for administrator/borrower access
 * <Route path="/admin/sophiesLoan" component={SophiesLoan} />
 *
 * // Direct component usage
 * <SophiesLoan />
 * ```
 *
 * @description
 * The SophiesLoan component provides:
 * - Interactive loan transaction table with inline editing
 * - Real-time balance and interest calculations
 * - Payment and extra payment tracking
 * - Transaction confirmation system
 * - Add/remove transaction capabilities
 * - Fixed interest rate display (2.5% APR)
 * - Responsive table layout with administrative navigation
 *
 * @remarks
 * - Fixed interest rate of 2.5% APR for all calculations
 * - Confirmed transactions are read-only and highlighted in green
 * - Unconfirmed transactions can be edited and are highlighted in white
 * - Active row selection highlighted in light blue with black border
 * - Automatic data persistence through DataContext integration
 * - Supports adding new transactions and deleting unconfirmed ones
 */
export default function SophiesLoan() {

    /** Index of the currently active/selected transaction row (-1 for none) */
    const [active, setActive] = useState(-1)

    /** Data context providing loan management functions and Sophie's loan data */
    const { getLoan, updateLoan, addLoan, deleteLoan, sophiesLoan } = useData()

    // const [rate, setRate] = useState(0.025)
    /** Fixed annual percentage rate for interest calculations (2.5%) */
    const rate = 0.025

    /**
     * Effect hook to initialize loan data on component mount.
     * Fetches Sophie's loan transactions from the database.
     */
    useEffect(() => {
        getLoan("Sophie")
    }, [])

    /**
     * Updates a loan transaction with new payment information.
     * Handles both local state updates and database persistence.
     *
     * @param {number} index - Index of the transaction in the array
     * @param {Object} transaction - Updated transaction object containing payment details
     * @param {number} transaction.payment - Regular payment amount
     * @param {number} transaction.extra - Extra payment amount
     * @param {Date} transaction.date - Transaction date
     * @param {boolean} transaction.confirmed - Whether transaction is confirmed
     *
     * @example
     * ```javascript
     * const updatedTransaction = {
     *   id: 'tx123',
     *   payment: 500,
     *   extra: 100,
     *   date: new Date(),
     *   confirmed: false
     * };
     * update(2, updatedTransaction);
     * // Updates transaction at index 2 with new payment data
     * ```
     */
    const update = (index: number, transaction: LoanTransaction) => {
        console.log("index:", index, " tx:", transaction.payment, " Extra:", transaction.extra)
        let t = [...transactions]
        t[index] = transaction
        updateLoan(transaction)
    }

    return (
        <AdminPageLayout title="Sophie's Loan" subtitle={
            <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.75rem', color: '#6a9ac4', marginTop: '0.5rem' }}>
                Interest rate {100 * rate}% APR
            </p>
        }>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>

                {/* Table card */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Transactions
                        </span>
                        <button
                            onClick={() => addLoan({ date: new Date(), payment: 0, extra: 0, confirmed: false })}
                            style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#f59e0b', border: '1.5px solid #f59e0b', borderRadius: 4, padding: '0.3rem 1rem', cursor: 'pointer' }}
                        >
                            + Add Row
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.82rem' }}>
                            <thead>
                                <tr>
                                    {['', 'Date', 'Payment', 'Extra', 'Interest', 'Withdraw', 'Balance'].map((h, i) => (
                                        <th key={i} style={{ background: '#001830', color: '#6a9ac4', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #1c3050', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(sophiesLoan) && sophiesLoan.map((transaction, i) => (
                                    <TransactionRow
                                        key={i}
                                        index={i}
                                        update={update}
                                        transaction={transaction}
                                        active={active}
                                        setActive={setActive}
                                        remove={deleteLoan}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </AdminPageLayout>
    )
}

/**
 * Individual transaction row component for displaying and editing loan payment data.
 * Provides inline editing capabilities for unconfirmed transactions with real-time updates.
 * Handles user interaction, data validation, and visual state management.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.transaction - Transaction data object
 * @param {string} props.transaction.id - Unique transaction identifier
 * @param {Date} props.transaction.date - Transaction date
 * @param {number} props.transaction.payment - Regular payment amount
 * @param {number} props.transaction.extra - Extra payment amount
 * @param {number} props.transaction.interest - Calculated interest amount
 * @param {number} props.transaction.withdraw - Withdrawal amount
 * @param {number} props.transaction.balance - Current balance after transaction
 * @param {boolean} props.transaction.confirmed - Whether transaction is confirmed/locked
 * @param {number} props.index - Row index in the transaction array
 * @param {Function} props.update - Callback function to update transaction data
 * @param {Function} props.remove - Callback function to remove/delete transaction
 * @param {number} props.active - Index of currently active row (-1 for none)
 * @param {Function} props.setActive - Function to set active row index
 * @returns {JSX.Element} Interactive transaction table row
 *
 * @example
 * ```jsx
 * <TransactionRow
 *   transaction={{
 *     id: 'tx123',
 *     date: new Date('2024-01-15'),
 *     payment: 500,
 *     extra: 100,
 *     interest: 25.50,
 *     withdraw: 0,
 *     balance: 10000,
 *     confirmed: false
 *   }}
 *   index={0}
 *   update={handleUpdate}
 *   remove={handleRemove}
 *   active={0}
 *   setActive={setActiveRow}
 * />
 * ```
 *
 * @description
 * The TransactionRow component provides:
 * - Conditional inline editing for unconfirmed transactions
 * - Visual state indicators (confirmed=green, active=blue border)
 * - Real-time input validation for numeric fields
 * - Date picker for transaction date modification
 * - Delete functionality for unconfirmed transactions
 * - Automatic data persistence on blur events
 * - Currency formatting for monetary values
 *
 * @remarks
 * - Only unconfirmed transactions can be edited or deleted
 * - Confirmed transactions are displayed in read-only mode with green background
 * - Active row selection provides visual feedback with blue background and black border
 * - Input validation prevents non-numeric values in payment fields
 * - Date format converted to locale-specific display format
 * - Blur events trigger automatic saving of changes
 */
const TransactionRow = ({ transaction, index, update, remove, active, setActive }: TransactionRowProps) => {

    /** Local state for payment amount during editing */
    const [payment, setPayment] = useState(null)
    /** Local state for extra payment amount during editing */
    const [extra, setExtra] = useState(null)
    /** Local state for transaction date during editing */
    const [date, setDate] = useState(null)

    /**
     * Effect hook to synchronize local state with transaction prop changes.
     * Updates local editing state when transaction data changes externally.
     */
    useEffect(() => {
        setExtra(transaction.extra)
        setPayment(transaction.payment)
        setDate(transaction.date)
    }, [transaction.extra, transaction.payment, transaction.date])

    /**
     * Sets this row as the active/selected row for editing.
     * Enables inline editing mode for unconfirmed transactions.
     */
    const makeActive = () => {
        setActive(index)
    }

    /**
     * Converts a Date object to a formatted date string for display.
     * Uses MM/DD/YYYY format for consistent date representation.
     *
     * @param {Date} date - Date object to format
     * @returns {string} Formatted date string in MM/DD/YYYY format
     *
     * @example
     * ```javascript
     * toDateString(new Date('2024-01-15'))
     * // Returns: "1/15/2024"
     * ```
     */
    const toDateString = (date) => {
        const m = date.getUTCMonth() + 1
        const y = date.getUTCFullYear()
        const d = date.getDate()
        return m + "/" + d + "/" + y
    }

    return (
        <tr
            onClick={makeActive}
            style={{ backgroundColor: (active === index) ? 'lightblue' : transaction.confirmed ? 'lightgreen' : 'white', border: (active === index) ? "5px solid black" : "0px" }}
        >

            <td>
                {!transaction.confirmed && <img width="20px" onClick={() => remove(transaction.id)} src={deleted} alt="" />}
            </td>

            <td>
                {(!transaction.confirmed && (active === index)) ?
                    <input
                        style={{ fontSize: "20px", textAlign: "center" }}
                        type="date"
                        value={date.toISOString().split('T')[0]}
                        onChange={(e) => {
                            transaction.date = new Date(e.target.value)
                            setDate(new Date(e.target.value))
                        }}
                        onBlur={() => {
                            update(index, transaction)
                        }}
                    />
                    :
                    <span>
                        {toDateString(transaction.date)}
                    </span>
                }
            </td>

            <td onClick={() => { transaction.active = true; }}>
                {!transaction.confirmed && (active === index) ?
                    <input
                        style={{ fontSize: "20px", textAlign: "center" }}
                        value={payment}
                        onChange={(e) => {
                            if (!isNaN(e.target.value)) {
                                transaction.payment = e.target.value
                                setPayment(e.target.value)
                            }
                        }}
                        onBlur={() => {
                            update(index, transaction)
                        }}
                    />
                    :
                    <span>
                        <Currency value={transaction.payment} />
                    </span>
                }

            </td>

            <td onClick={() => { transaction.active = true; }}>
                {!transaction.confirmed && (active === index) ?
                    <input
                        style={{ fontSize: "20px", textAlign: "center" }}
                        value={extra}
                        onChange={(e) => {
                            if (!isNaN(e.target.value)) {
                                transaction.extra = e.target.value
                                setExtra(e.target.value)
                            }
                        }}
                        onBlur={() => {
                            update(index, transaction)
                        }}
                    />
                    :
                    <span>
                        <Currency value={transaction.extra} />
                    </span>
                }

            </td>

            <td><Currency value={transaction.interest} /></td>
            <td><Currency value={transaction.withdraw} /></td>
            <td><Currency value={transaction.balance} /></td>

        </tr>
    )
}
